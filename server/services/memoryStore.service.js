import { generateEmbedding } from "./embedding.service.js";
import { qdrant, COLLECTION } from "./vector.service.js"; // ✅ shared collection

export async function storeMemory(text, userId, importance) {
  const embedding = await generateEmbedding(text);

  await qdrant.upsert(COLLECTION, {
    points: [
      {
        id: crypto.randomUUID(),
        vector: embedding,
        payload: {
          text,
          user_id: userId,
          importance,
          created_at: Date.now(),
        },
      },
    ],
  });
}
