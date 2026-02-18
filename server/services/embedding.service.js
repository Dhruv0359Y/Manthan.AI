import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// 🔁 variable name SAME rakha (client)
const client = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

// ❗ function name SAME
export async function generateEmbedding(text) {
  const model = client.getGenerativeModel({
    model: "models/gemini-embedding-001", // Gemini embedding model
  });

  const result = await model.embedContent(text);

  // SAME output type: array of numbers
  return result.embedding.values;
}
