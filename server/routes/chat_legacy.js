import dotenv from "dotenv";
import express from "express";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "../services/embedding.service.js";
import { getMemories } from "../memoryStore.js";
import { cosineSimilarity } from "../similarity.js";
import { searchVector } from "../services/vector.service.js";

dotenv.config();

const router = express.Router();
console.log("KEY CHECK:", process.env.OPENAI_API_KEY?.slice(0, 10));
console.log("MEMORIES COUNT:", getMemories().length);

// 🔁 variable name SAME
const client = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1️⃣ embedding of user question
    const queryEmbedding = await generateEmbedding(message);

    // 2️⃣ find relevant memories
    const relevantMemories = getMemories()
      .map((mem) => ({
        text: mem.text,
        score: cosineSimilarity(queryEmbedding, mem.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((m) => `- ${m.text}`)
      .join("\n");

    // 3️⃣ Gemini model
    const model = client.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });

    // 4️⃣ prompt with memory injection
    const prompt = `
You are an assistant with long-term memory.

User memory:
${relevantMemories || "No relevant memory found."}

User question:
${message}
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;
