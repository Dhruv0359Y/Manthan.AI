// Gemini 2.0 Flash pricing (per 1M tokens)
const PRICING = {
  input: 0.075, // $0.075 per 1M input tokens
  output: 0.3, // $0.30 per 1M output tokens
};

// rough estimate: 1 token ≈ 4 characters
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * PRICING.input;
  const outputCost = (outputTokens / 1_000_000) * PRICING.output;
  const total = inputCost + outputCost;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost: inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost: total.toFixed(6),
    formattedCost: `$${total.toFixed(4)}`,
  };
}

export function buildUsageSummary(query, reply, mode, latency) {
  const inputTokens = estimateTokens(query);
  const outputTokens = estimateTokens(reply);
  const cost = calculateCost(inputTokens, outputTokens);

  return {
    mode,
    latency: `${(latency / 1000).toFixed(2)}s`,
    latencyOk: mode === "quick" ? latency < 120000 : latency < 600000, // 2min / 10min
    ...cost,
  };
}
