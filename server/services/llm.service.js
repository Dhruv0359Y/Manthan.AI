import { GoogleGenerativeAI } from "@google/generative-ai";
import ollama from "ollama";

const client = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

export async function generateResponse(
  prompt,
  model = "gemini",
  maxTokens = 3000,
) {
  if (model === "local") {
    const response = await ollama.chat({
      model: "qwen2.5:0.5b",
      messages: [{ role: "user", content: prompt }],
    });
    return response.message.content;
  }

  // Gemini with local fallback
  try {
    const m = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.5 },
    });
    const result = await m.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.warn("Gemini failed, falling back to Qwen:", err.message);
    const response = await ollama.chat({
      model: "qwen2.5:0.5b",
      messages: [{ role: "user", content: prompt }],
    });
    return response.message.content;
  }
}
