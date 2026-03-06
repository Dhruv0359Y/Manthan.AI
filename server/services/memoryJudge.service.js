import { GoogleGenerativeAI } from "@google/generative-ai";
import ollama from "ollama";
import dotenv from "dotenv"; // 👈 add this
dotenv.config();
const client = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

export async function isUsefulMemory(text) {
  if (!text || text.trim().length < 10) {
    return false;
  }

  const lower = text.toLowerCase();

  const quickSignals = [
    "my name",
    "i am",
    "i live",
    "i prefer",
    "i like",
    "my goal",
    "my project",
    "working on",
    "preparing for",
  ];

  if (quickSignals.some((k) => lower.includes(k))) {
    return true;
  }

  const prompt = `
You are a strict memory filter for an AI assistant.

Store ONLY information useful for future conversations:
- identity
- preferences
- goals
- projects

Do NOT store:
- greetings
- questions
- temporary requests

Reply ONLY with:
YES
or
NO

Message:
"${text}"
`;

  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim().toUpperCase();

    return answer.startsWith("YES");
  } catch (err) {
    console.warn("Gemini memory judge failed, using Qwen fallback");

    const response = await ollama.chat({
      model: "qwen2.5:0.5b",
      messages: [{ role: "user", content: prompt }],
    });

    const answer = response.message.content.trim().toUpperCase();
    return answer.startsWith("YES");
  }
}
