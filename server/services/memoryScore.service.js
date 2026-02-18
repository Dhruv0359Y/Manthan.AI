export function scoreMemory(text) {
  if (text.length < 20) return 2;
  const keywords = [
    "i am",
    "i live",
    "my goal",
    "i want",
    "i like",
    "i hate",
    "my project",
    "working on",
    "preparing for",
  ];
  const match = keywords.some((k) => text.toLowerCase().includes(k)); // ✅ fixed typo
  return match ? 8 : 5;
}
