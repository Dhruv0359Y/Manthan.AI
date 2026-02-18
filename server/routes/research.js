import express from "express";
import { quickResearch, deepResearch } from "../services/researcher.service.js";
import {
  saveReport,
  getPastReports,
  searchPastReports,
} from "../services/report.service.js";
import { buildUsageSummary } from "../services/tokens.service.js";
import { searchVector } from "../services/vector.service.js";
import { generateEmbedding } from "../services/embedding.service.js";

const router = express.Router();

// ⚡ QUICK MODE
router.post("/quick", async (req, res) => {
  try {
    const { query, userId = "default_user", model = "gemini" } = req.body;
    if (!query) return res.status(400).json({ error: "query is required" });

    console.log(`⚡ Quick [${model}]: "${query}"`);

    const embedding = await generateEmbedding(query);
    const memories = await searchVector(embedding, 3);
    const memoryBlock = memories.map((m) => `- ${m.text}`).join("\n");

    const pastReports = await searchPastReports(userId, embedding, 1);
    const pastContext = pastReports.length
      ? `User has researched this before: "${pastReports[0].query}"`
      : "";

    const result = await quickResearch(
      query,
      memoryBlock + "\n" + pastContext,
      userId,
      model,
    );

    const usage = buildUsageSummary(
      query,
      result.reply,
      "quick",
      result.latency,
    );
    await saveReport(userId, query, result.reply, "quick", result.sources);

    res.json({
      mode: "quick",
      reply: result.reply,
      sources: result.sources,
      usage,
    });
  } catch (err) {
    console.error("QUICK ERROR:", err);
    res
      .status(500)
      .json({ error: "Quick research failed", details: err.message });
  }
});

// 🔬 DEEP MODE
router.post("/deep", async (req, res) => {
  try {
    const { query, userId = "default_user", model = "gemini" } = req.body;
    if (!query) return res.status(400).json({ error: "query is required" });

    console.log(`🔬 Deep [${model}]: "${query}"`);

    const embedding = await generateEmbedding(query);
    const memories = await searchVector(embedding, 5);
    const memoryBlock = memories.map((m) => `- ${m.text}`).join("\n");

    const pastReports = await searchPastReports(userId, embedding, 2);
    const pastContext = pastReports.length
      ? pastReports
          .map(
            (r) =>
              `Previous research on "${r.query}":\n${r.report.slice(0, 300)}...`,
          )
          .join("\n\n")
      : "";

    const result = await deepResearch(
      query,
      memoryBlock + "\n" + pastContext,
      userId,
      model,
    );

    const usage = buildUsageSummary(
      query,
      result.reply,
      "deep",
      result.latency,
    );
    await saveReport(userId, query, result.reply, "deep", result.sources);

    res.json({
      mode: "deep",
      reply: result.reply,
      sources: result.sources,
      subQuestions: result.subQuestions,
      usage,
    });
  } catch (err) {
    console.error("DEEP ERROR:", err);
    res
      .status(500)
      .json({ error: "Deep research failed", details: err.message });
  }
});

// 📚 GET PAST REPORTS
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await getPastReports(userId, 10);
    res.json({ reports });
  } catch (err) {
    console.error("HISTORY ERROR:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 🔍 SEARCH PAST REPORTS
router.post("/history/search", async (req, res) => {
  try {
    const { query, userId = "default_user" } = req.body;
    const embedding = await generateEmbedding(query);
    const reports = await searchPastReports(userId, embedding, 3);
    res.json({ reports });
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: "Failed to search history" });
  }
});

export default router;
