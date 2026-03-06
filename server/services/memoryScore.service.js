export function scoreMemory(text) {
  const t = text.toLowerCase();

  if (t.length < 20) return 2;

  if (t.length > 120) return 7;

  const strongSignals = [
    "i am",
    "my name",
    "i live",
    "my goal",
    "i want",
    "i like",
    "i hate",
    "my project",
    "working on",
    "preparing for",
    "remember",
    "prefer",
    "always",
    "never",
    "favorite",
  ];

  const match = strongSignals.some((k) => t.includes(k));

  return match ? 8 : 5;
}
