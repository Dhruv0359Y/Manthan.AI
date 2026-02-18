# 🧠 Manthan.AI — Deep Research Agent with Persistent Memory

Manthan.AI is a production-grade AI research agent that thinks like a **senior research engineer** — searching the web, synthesizing sources, generating structured reports, and remembering everything about you across sessions.

> **"Manthan"** (मंथन) means _deep churning_ in Sanskrit — the process of extracting wisdom from chaos. That's exactly what this agent does.

---

## ✨ What Makes Manthan.AI Different

Most AI assistants forget you the moment the conversation ends. Manthan.AI doesn't.

- 🔍 **Real web search** via Tavily — not hallucinated answers
- 🧠 **Persistent memory** via Qdrant vector database — survives server restarts
- 📄 **Structured reports** — not surface-level summaries
- ⚡ **Two research modes** — fast answers or deep multi-source synthesis
- 🔁 **Cross-session context** — past research informs future answers
- 💰 **Token + cost tracking** — know exactly what each query costs

---

## 🎯 Core Capabilities

### ⚡ Quick Mode `< 2 min`

Fast, high-signal answers to focused technical questions. Searches the web, pulls top sources, and gives a sharp concise answer.

```
"Quick overview of RAG chunking strategies"
"What is the difference between LoRA and QLoRA?"
```

### 🔬 Deep Mode `< 10 min`

Multi-source synthesis with structured reasoning. Breaks your query into sub-questions, searches each one, and writes a full production-quality report with findings, code examples, and recommendations.

```
"Deep dive on RAG chunking strategies with tradeoffs"
"Compare LoRA vs fine-tuning vs prompt tuning with numbers"
```

### 💬 Chat Mode

Memory-aware conversational chat. Remembers your name, preferences, goals, and past research — and uses it naturally in every response.

```
"Remember I prefer code examples"
"What should I study next based on my goals?"
"Go deeper on the report from earlier"
```

---

## 🏗️ System Architecture

```
User Message
     ↓
Memory Judge (Gemini / Qwen fallback)
     ↓ only if useful
Memory Scorer → Importance Score (2 / 5 / 8)
     ↓
Gemini Embedding API
     ↓
Qdrant Vector Database (Docker)
     ↓
┌─────────────────────────────────────┐
│  Quick Mode     │  Deep Mode        │
│  1 search       │  3 sub-questions  │
│  Top 3 sources  │  7 sources each   │
│  Concise answer │  Full report      │
└─────────────────────────────────────┘
     ↓
Top-K Memory Retrieval (past facts + past reports)
     ↓
Prompt Injection
     ↓
Gemini 2.0 Flash → Response
     ↓
Report saved to Qdrant (importance: 9)
```

---

## 🧠 Smart Memory System

Manthan.AI doesn't store everything — it stores what matters.

### Memory Judge

Every message is passed through an AI filter before storing:

```
"Hello"                          → ❌ Not stored
"My name is Dhruv"               → ✅ Stored (importance: 8)
"I am preparing for GSoC"        → ✅ Stored (importance: 8)
"What time is it?"               → ❌ Not stored
```

### Memory Scoring

| Score | Type                                            |
| ----- | ----------------------------------------------- |
| 8     | Strong personal info (name, goals, preferences) |
| 5     | Decent length, probably useful                  |
| 2     | Short, low value                                |
| 9     | Research reports (always high priority)         |

### Smart Forgetting

When a user exceeds 300 stored memories, the **lowest importance memories are deleted first** — keeping only what matters most.

### Cross-Mode Memory

All three modes share the same memory store. Research done in Deep mode is available in Chat mode and vice versa.

---

## 🛠️ Tech Stack

| Layer        | Technology                      |
| ------------ | ------------------------------- |
| Backend      | Node.js + Express               |
| Primary LLM  | Gemini 2.0 Flash                |
| Fallback LLM | Qwen 2.5 0.5b (Ollama, offline) |
| Embeddings   | Gemini Embedding API (3072 dim) |
| Vector DB    | Qdrant (Docker)                 |
| Web Search   | Tavily API                      |
| Frontend     | React + Vite                    |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker
- Ollama (optional, for offline fallback)

### 1. Clone the repo

```bash
git clone https://github.com/Dhruv0359Y/Manthan.AI.git
cd Manthan.AI
```

### 2. Start Qdrant

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 3. Set up environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

Get your keys:

- Gemini → [aistudio.google.com](https://aistudio.google.com)
- Tavily → [tavily.com](https://tavily.com) (free: 1000 searches/month)

### 4. Install & run backend

```bash
cd server
npm install
npm run dev
```

### 5. Install & run frontend

```bash
cd client
npm install
npm run dev
```

### 6. Open in browser

```
http://localhost:5173
```

---

## 📡 API Reference

### Chat (memory-aware)

```http
POST /chat
Content-Type: application/json

{
  "message": "My name is Dhruv and I love cybersecurity",
  "userId": "dhruv123"
}
```

### Quick Research

```http
POST /research/quick
Content-Type: application/json

{
  "query": "Quick overview of RAG chunking strategies",
  "userId": "dhruv123"
}
```

### Deep Research

```http
POST /research/deep
Content-Type: application/json

{
  "query": "Compare LoRA vs fine-tuning vs prompt tuning",
  "userId": "dhruv123"
}
```

### Research History

```http
GET /research/history/:userId
```

### Search Past Reports

```http
POST /research/history/search
Content-Type: application/json

{
  "query": "RAG strategies",
  "userId": "dhruv123"
}
```

---

## 📁 Project Structure

```
Manthan.AI/
├── server/
│   ├── index.js                       # Entry point
│   ├── .env                           # API keys (gitignored)
│   ├── routes/
│   │   ├── chat.js                    # Memory-aware chat
│   │   └── research.js                # Quick + Deep mode
│   └── services/
│       ├── vector.service.js          # Qdrant client + search
│       ├── embedding.service.js       # Gemini embeddings
│       ├── memoryStore.service.js     # Store memory in Qdrant
│       ├── memoryjudge.service.js     # AI memory filter
│       ├── memoryscore.service.js     # Importance scoring
│       ├── forget.service.js          # Delete old memories
│       ├── researcher.service.js      # Quick + Deep research logic
│       ├── report.service.js          # Save + search reports
│       ├── tavily.service.js          # Web search
│       └── tokens.service.js          # Token + cost tracking
└── client/
    ├── index.html
    └── src/
        └── App.jsx                    # Full React UI
```

---

## 💡 Example Queries

```
⚡ Quick:  "What is semantic chunking in RAG?"
⚡ Quick:  "Quick overview of attention mechanisms"

🔬 Deep:   "Deep dive on vector database indexing strategies"
🔬 Deep:   "Compare HNSW vs IVF vs Flat indexing with benchmarks"

💬 Chat:   "Remember I prefer code examples"
💬 Chat:   "What should I learn next based on my goals?"
💬 Chat:   "Summarize what we researched about RAG earlier"
```

---

## 🏆 Built For Hackathon

This project targets the challenge:

> _"Build a Deep Research Agent for technical and engineering audiences that explores documentation, research papers, blogs, and code repositories to deliver production-quality technical insights."_

### How Manthan.AI hits every requirement:

| Requirement             | Implementation                                        |
| ----------------------- | ----------------------------------------------------- |
| Quick Mode < 2 min      | Tavily basic search + Gemini                          |
| Deep Mode < 10 min      | 3 sub-questions + parallel search + structured report |
| Persistent memory       | Qdrant vector DB (survives restarts)                  |
| Remember preferences    | Memory judge + scorer + Qdrant storage                |
| Research history        | Reports saved to Qdrant, searchable semantically      |
| Token + cost tracking   | `tokens.service.js` with Gemini pricing               |
| Latency guarantees      | Tracked per query, flagged if exceeded                |
| Graceful error handling | Gemini → Qwen fallback on every LLM call              |

---

## 📜 License

MIT — free to use, modify, and distribute.

---

<p align="center">Built with ❤️ by <a href="https://github.com/Dhruv0359Y">Dhruv</a></p>
