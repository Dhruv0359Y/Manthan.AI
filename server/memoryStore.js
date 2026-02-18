const memories = [];

export function addMemory(text, embedding) {
  memories.push({
    text,
    embedding,
    createdAt: new Date(),
  });
  console.log("🧠 MEMORY AFTER ADD:", memories.length);
}

export function getMemories() {
  console.log("CURRENT MEMORY:", memories);
  return memories;
}
