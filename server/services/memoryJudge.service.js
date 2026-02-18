import { GoogleGenerativeAI } from "@google/generative-ai";
import ollama from "ollama";
import dotenv from "dotenv"; // 👈 add this
dotenv.config();
const client = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

export async function isUsefulMemory(text) {
  const prompt = `
You are a memory filter.

Decide if the following message contains LONG-TERM useful personal information
(identity, goals, preferences, projects, important life events).

Reply ONLY with:
YES
or
NO

Message:
"${text}"
`;

  // 1️⃣ PRIMARY — Gemini
  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim().toUpperCase();

    return answer.startsWith("YES");
  } catch (err) {
    console.warn("Gemini memory judge failed, using Qwen fallback");
    console.error("Gemini error details:", err.message);

    // 2️⃣ FALLBACK — Qwen (offline)
    const response = await ollama.chat({
      model: "qwen2.5:0.5b",
      messages: [{ role: "user", content: prompt }],
    });

    const answer = response.message.content.trim().toUpperCase();
    return answer.startsWith("YES");
  }
}
