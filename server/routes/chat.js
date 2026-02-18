import express from "express";
import dotenv from "dotenv";

import { generateEmbedding } from "../services/embedding.service.js";
import { searchVector } from "../services/vector.service.js";
import { isUsefulMemory } from "../services/memoryjudge.service.js";
import { scoreMemory } from "../services/memoryscore.service.js";
import { storeMemory } from "../services/memoryStore.service.js";
import { forgetOldMemories } from "../services/forget.service.js";
import { searchPastReports } from "../services/report.service.js";
import { generateResponse } from "../services/llm.service.js";

dotenv.config();

const router = express.Router();

function isCasualMessage(message) {
  const trimmed = message.trim().toLowerCase();
  const casualPhrases = [
    "hello",
    "hi",
    "hey",
    "sup",
    "yo",
    "hiya",
    "howdy",
    "good morning",
    "good evening",
    "good night",
    "bye",
    "thanks",
    "thank you",
    "ok",
    "okay",
    "cool",
    "nice",
    "lol",
  ];
  const isShort = trimmed.split(" ").length <= 3;
  const hasNoQuestion = !trimmed.includes("?");
  const isCasualPhrase = casualPhrases.some((p) => trimmed.startsWith(p));
  return isShort && hasNoQuestion && isCasualPhrase;
}

router.post("/", async (req, res) => {
  try {
    const { message, userId = "default_user", model = "gemini" } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    console.log(`💬 Chat [${model}]: "${message}"`);

    // 1️⃣ Smart memory storing
    try {
      const useful = await isUsefulMemory(message);
      console.log("🧠 Is useful memory?", useful);
      if (useful) {
        const importance = scoreMemory(message);
        await storeMemory(message, userId, importance);
        console.log("✅ Memory stored with importance:", importance);
        if (Math.random() < 0.02) await forgetOldMemories(userId, 300);
      }
    } catch (memErr) {
      console.warn("Memory storing failed:", memErr.message);
    }

    let prompt;

    // 2️⃣ Casual message — skip memory injection
    if (isCasualMessage(message)) {
      console.log("💬 Casual — skipping memory injection");
      prompt = `You are a friendly, concise AI assistant. Reply naturally and briefly.

User: ${message}`;
    } else {
      // 3️⃣ Real question — embed + search
      const qEmbedding = await generateEmbedding(message);
      const memories = await searchVector(qEmbedding, 3);
      const pastReports = await searchPastReports(userId, qEmbedding, 2);

      const hasMemory = memories.length > 0;
      const hasResearch = pastReports.length > 0;

      const memoryBlock = hasMemory
        ? memories.map((m) => `- ${m.text}`).join("\n")
        : null;

      const researchBlock = hasResearch
        ? pastReports
            .map((r) => `"${r.query}":\n${r.report.slice(0, 400)}`)
            .join("\n\n")
        : null;

      prompt = `
You are Manthan.Ai, a concise AI assistant with long-term memory, built by Dhruv.

If the user asks who you are or about your creator, clearly state that you were built by Dhruv.
Otherwise, do not mention your creator unnecessarily.

Use context only if genuinely relevant. Never mention memory unless asked.

${hasMemory ? `User facts:\n${memoryBlock}\n` : ""}
${hasResearch ? `Past research:\n${researchBlock}\n` : ""}

Question: ${message}

Answer concisely:
`;
    }

    // 4️⃣ Generate with selected model
    const reply = await generateResponse(prompt, model, 300);
    res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;
