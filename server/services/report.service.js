import { qdrant, COLLECTION } from "./vector.service.js";
import { generateEmbedding } from "./embedding.service.js";

export async function saveReport(userId, query, report, mode, sources) {
  const embedding = await generateEmbedding(query);

  await qdrant.upsert(COLLECTION, {
    points: [
      {
        id: crypto.randomUUID(),
        vector: embedding,
        payload: {
          text: query,
          full_report: report,
          sources: JSON.stringify(sources),
          mode,
          user_id: userId,
          type: "report", // so we can filter reports separately
          importance: 9, // reports are always high importance
          created_at: Date.now(),
        },
      },
    ],
  });

  console.log(`📄 Report saved for query: "${query}"`);
}

export async function getPastReports(userId, limit = 5) {
  const response = await qdrant.scroll(COLLECTION, {
    filter: {
      must: [
        { key: "user_id", match: { value: userId } },
        { key: "type", match: { value: "report" } },
      ],
    },
    limit,
  });

  return response.points.map((p) => ({
    id: p.id,
    query: p.payload.text,
    report: p.payload.full_report,
    mode: p.payload.mode,
    sources: JSON.parse(p.payload.sources || "[]"),
    created_at: p.payload.created_at,
  }));
}

export async function searchPastReports(userId, embedding, limit = 3) {
  const result = await qdrant.search(COLLECTION, {
    vector: embedding,
    limit,
    filter: {
      must: [
        { key: "user_id", match: { value: userId } },
        { key: "type", match: { value: "report" } },
      ],
    },
  });

  return result.map((r) => ({
    query: r.payload.text,
    report: r.payload.full_report,
    mode: r.payload.mode,
    score: r.score,
  }));
}
