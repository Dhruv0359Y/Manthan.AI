import dotenv from "dotenv";
dotenv.config();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function tavilySearch(query, depth = "basic") {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: depth, // "basic" for quick, "advanced" for deep
        include_answer: true, // tavily gives a pre-summarized answer too
        include_raw_content: false, // saves tokens
        max_results: depth === "advanced" ? 7 : 3,
      }),
    });

    const data = await response.json();

    return {
      answer: data.answer || null,
      results: data.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
    };
  } catch (err) {
    console.error("Tavily search failed:", err.message);
    retur { answer: null, results: [] };
  }
}
