export function generateEmbedding(text) {
  return text
    .toLowerCase()
    .split("")
    .map((char) => char.charCodeAt(0) / 255)
    .slice(0, 50);
}
