import { tavilySearch } from "./tavily.service.js";
import { searchPastReports } from "./report.service.js";
import { generateEmbedding } from "./embedding.service.js";
import { generateResponse } from "./llm.service.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ---------------- URL TYPE DETECTION ---------------- */

function detectLinkType(url) {
  if (url.includes("github.com")) return "github";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.endsWith(".pdf")) return "pdf";
  return "web";
}

/* ---------------- FETCH WEBPAGE CONTENT ---------------- */

async function fetchUrlContent(url) {
  try {
    const res = await axios.get(url, { timeout: 10000 });

    const cleanText = res.data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 8000);

    return cleanText;
  } catch (err) {
    console.error("URL fetch failed:", err.message);
    return null;
  }
}

/* ---------------- SUBQUESTION PLANNER ---------------- */

async function planSubQuestions(query) {
  try {
    const m = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
    });

    const result = await m.generateContent(`
Break this research query into 3 focused sub-questions.
Return ONLY a JSON array of strings.

Query: "${query}"
`);

    const raw = result.response
      .text()
      .replace(/```json|```/g, "")
      .trim();

    return JSON.parse(raw);
  } catch {
    return [query];
  }
}

/* ---------------- URL PROCESSING ---------------- */

async function processUrls(query) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [...new Set(query.match(urlRegex) || [])];

  let externalContent = "";

  for (const url of urls) {
    const type = detectLinkType(url);

    if (type === "linkedin") {
      externalContent += `LinkedIn profile reference: ${url}\n`;
      continue;
    }

    const content = await fetchUrlContent(url);

    if (content) {
      externalContent += `\nContent from ${url}:\n${content}\n`;
    }
  }

  const cleanQuery = query.replace(urlRegex, "").trim();

  return { externalContent, cleanQuery };
}

/* ---------------- QUICK MODE ---------------- */

export async function quickResearch(
  query,
  memoryBlock = "",
  userId = "default_user",
  model = "gemini",
) {
  const start = Date.now();

  const { externalContent, cleanQuery } = await processUrls(query);

  const embedding = await generateEmbedding(query);

  const pastReports = await searchPastReports(userId, embedding, 2);

  const pastContext = pastReports.length
    ? pastReports
        .map(
          (r) =>
            `Previous research on "${r.query}" (${r.mode} mode):\n${r.report.slice(
              0,
              400,
            )}`,
        )
        .join("\n\n")
    : "None";

  const { answer, results } = await tavilySearch(cleanQuery || query, "basic");

  const sources = results
    .map((r) => `[${r.title}](${r.url})\n${r.content}`)
    .join("\n\n");

  const prompt = `You are a senior research engineer.

User memory/preferences:
${memoryBlock || "None"}

Past research context:
${pastContext}

External content:
${externalContent || "None"}

Web sources:
${sources}

${answer ? `Pre-summarized answer: ${answer}` : ""}

Question: ${query}

Give a concise technical answer in under 3 paragraphs.`;

  const reply = await generateResponse(prompt, model, 600);

  return {
    mode: "quick",
    reply,
    sources: results.map((r) => ({ title: r.title, url: r.url })),
    latency: Date.now() - start,
    tokensUsed: Math.ceil((prompt + reply).length / 4),
  };
}

/* ---------------- DEEP MODE ---------------- */

export async function deepResearch(
  query,
  memoryBlock = "",
  userId = "default_user",
  model = "gemini",
) {
  const start = Date.now();

  const { externalContent, cleanQuery } = await processUrls(query);

  const embedding = await generateEmbedding(query);

  const pastReports = await searchPastReports(userId, embedding, 2);

  const pastContext = pastReports.length
    ? pastReports
        .map(
          (r) =>
            `Previous research on "${r.query}" (${r.mode} mode):\n${r.report.slice(
              0,
              400,
            )}`,
        )
        .join("\n\n")
    : "None";

  let subQuestions = await planSubQuestions(cleanQuery || query);

  if (!Array.isArray(subQuestions)) subQuestions = [query];

  const searchResults = await Promise.all(
    subQuestions.map((q) => tavilySearch(q, "advanced")),
  );

  const allSources = searchResults.flatMap((s) => s.results);

  const uniqueSources = allSources.filter(
    (s, i, arr) => arr.findIndex((x) => x.url === s.url) === i,
  );

  const sourcesText = uniqueSources
    .map((r) => `[${r.title}](${r.url})\n${r.content}`)
    .join("\n\n");

  const prompt = `You are a senior research engineer writing a production-quality technical report.

User memory/preferences:
${memoryBlock || "None"}

Past research context:
${pastContext}

External content:
${externalContent || "None"}

Research sources:
${sourcesText}

Query: ${query}

Sub-questions explored:
${subQuestions.join(", ")}

Write a structured report with:

1. Summary (2–3 sentences)
2. Key Findings (include tradeoffs)
3. Code Example if relevant
4. Practical Recommendations
5. Sources

Prefer technical documentation and research papers over blogs.`;

  const reply = await generateResponse(prompt, model, 1200);

  return {
    mode: "deep",
    reply,
    sources: uniqueSources.map((r) => ({ title: r.title, url: r.url })),
    subQuestions,
    latency: Date.now() - start,
    tokensUsed: Math.ceil((prompt + reply).length / 4),
  };
}
