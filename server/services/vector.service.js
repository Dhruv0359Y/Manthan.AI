import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

export const COLLECTION = "dupermemory_collection2"; // ✅ single source of truth

export async function initVectorDB() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.find((c) => c.name === COLLECTION);

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: 3072,
        distance: "Cosine",
      },
    });
    console.log("✅ Vector collection created");
  } else {
    console.log("✅ Vector collection already exists");
  }
}

export async function searchVector(embedding, limit = 3) {
  const result = await qdrant.search(COLLECTION, {
    vector: embedding,
    limit,
  });

  const memories = result.map((r) => ({
    text: r.payload.text,
    score: r.score,
  }));

  console.log("🧠 Retrieved memories:", memories);
  return memories;
}
