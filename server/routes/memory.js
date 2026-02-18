import express from "express";
import { isUsefulMemory } from "../services/memoryjudge.service.js";
import { scoreMemory } from "../services/memoryscore.service.js";
import { storeMemory } from "../services/memoryStore.service.js";
import { forgetOldMemories } from "../services/forget.service.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { text, userId } = req.body;

    if (!text || !userId) {
      return res.status(400).json({ error: "text and userId are required" });
    }

    // 1️⃣ Filter — only store useful memories
    const useful = await isUsefulMemory(text);
    if (!useful) {
      return res.json({ stored: false, reason: "Not useful long-term memory" });
    }

    // 2️⃣ Score it
    const importance = scoreMemory(text);

    // 3️⃣ Store with importance
    await storeMemory(text, userId, importance);

    // 4️⃣ Clean up low-importance old memories
    await forgetOldMemories(userId, 300);

    res.json({ stored: true, importance });
  } catch (err) {
    console.error("MEMORY ERROR:", err);
    res.status(500).json({ error: "Memory storage failed" });
  }
});

export default router;
