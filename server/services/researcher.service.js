import { tavilySearch } from "./tavily.service.js";
import { searchPastReports } from "./report.service.js";
import { generateEmbedding } from "./embedding.service.js";
import { generateResponse } from "./llm.service.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

// used only for sub-question planning (always Gemini — lightweight)
async function planSubQuestions(query) {
  try {
    const m = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
    });
    const result = await m.generateContent(
      `Break this research query into 3 focused sub-questions. Return only a JSON array of strings.
Query: "${query}"`,
    );
    const raw = result.response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(raw);
  } catch {
    return [query];
  }
}

// ⚡ QUICK MODE
export async function quickResearch(
  query,
  memoryBlock = "",
  userId = "default_user",
  model = "gemini",
) {
  const start = Date.now();

  // get past reports for cross-mode context
  const embedding = await generateEmbedding(query);
  const pastReports = await searchPastReports(userId, embedding, 2);
  const pastContext = pastReports.length
    ? pastReports
        .map(
          (r) =>
            `Previous research on "${r.query}" (${r.mode} mode):\n${r.report.slice(0, 400)}`,
        )
        .join("\n\n")
    : "None";

  const { answer, results } = await tavilySearch(query, "basic");
  const sources = results
    .map((r) => `[${r.title}](${r.url})\n${r.content}`)
    .join("\n\n");

  const prompt = `You are a senior research engineer. Answer concisely and technically.

User memory/preferences:
${memoryBlock || "None"}

Past research context:
${pastContext}

Web sources:
${sources}

${answer ? `Pre-summarized answer: ${answer}` : ""}

Question: ${query}

Give a sharp technical answer. Reference past research if relevant. Max 3 paragraphs.`;

  const reply = await generateResponse(prompt, model, 600);

  return {
    mode: "quick",
    reply,
    sources: results.map((r) => ({ title: r.title, url: r.url })),
    latency: Date.now() - start,
    tokensUsed: Math.ceil((prompt + reply).length / 4),
  };
}

// 🔬 DEEP MODE
export async function deepResearch(
  query,
  memoryBlock = "",
  userId = "default_user",
  model = "gemini",
) {
  const start = Date.now();

  // get past reports for cross-mode context
  const embedding = await generateEmbedding(query);
  const pastReports = await searchPastReports(userId, embedding, 2);
  const pastContext = pastReports.length
    ? pastReports
        .map(
          (r) =>
            `Previous research on "${r.query}" (${r.mode} mode):\n${r.report.slice(0, 400)}`,
        )
        .join("\n\n")
    : "None";

  // break into sub-questions
  let subQuestions = await planSubQuestions(query);
  if (!Array.isArray(subQuestions)) subQuestions = [query];

  // search each sub-question in parallel
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

Research sources:
${sourcesText}

Query: ${query}
Sub-questions explored: ${subQuestions.join(", ")}

Write a structured report with:
1. **Summary** (2-3 sentences)
2. **Key Findings** (with tradeoffs)
3. **Code Example** (if relevant)
4. **Recommendations** (production-ready advice)
5. **Sources** (list URLs)

Reference past research context if it adds value.`;

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
