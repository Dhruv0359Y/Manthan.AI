import { qdrant, COLLECTION } from "./vector.service.js"; // ✅ shared collection

export async function forgetOldMemories(userId, maxMemories = 300) {
  const response = await qdrant.scroll(COLLECTION, {
    filter: {
      must: [{ key: "user_id", match: { value: userId } }],
    },
    limit: 1000,
  });

  const points = response.points;

  if (points.length <= maxMemories) return;

  const sorted = points.sort(
    (a, b) => a.payload.importance - b.payload.importance,
  );

  const toDelete = sorted.slice(0, points.length - maxMemories);

  await qdrant.delete(COLLECTION, {
    points: toDelete.map((p) => p.id),
  });

  console.log(`🗑️ Deleted ${toDelete.length} old memories`);
}
