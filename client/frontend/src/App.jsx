import { useState, useRef, useEffect, useCallback } from "react";

const API = "http://localhost:5000";

const MODES = {
  quick: { label: "Quick", icon: "⚡", desc: "Fast answer · <2 min", color: "#00f5a0", glow: "rgba(0,245,160,0.12)" },
  deep:  { label: "Deep",  icon: "◎", desc: "Full report · <10 min", color: "#a78bfa", glow: "rgba(167,139,250,0.12)" },
  chat:  { label: "Chat",  icon: "◉", desc: "Memory chat",           color: "#fbbf24", glow: "rgba(251,191,36,0.10)" },
};

const MODELS = {
  gemini: { label: "Gemini", icon: "✦", color: "#60a5fa", glow: "rgba(96,165,250,0.12)" },
  local:  { label: "Local",  icon: "⬡", color: "#fbbf24", glow: "rgba(251,191,36,0.12)" },
};

const SUGGESTIONS = [
  { text: "Quick overview of RAG chunking strategies", mode: "quick" },
  { text: "Deep dive: LoRA vs fine-tuning tradeoffs", mode: "deep" },
  { text: "Compare transformer vs SSM architectures", mode: "deep" },
  { text: "Remember I prefer code examples", mode: "chat" },
];

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --bg:       #03040a;
        --surface:  #0c0d18;
        --surface2: #11121f;
        --surface3: #181928;
        --border:   rgba(255,255,255,0.055);
        --border2:  rgba(255,255,255,0.10);
        --text:     #eeeef5;
        --muted:    rgba(238,238,245,0.38);
        --quick:    #00f5a0;
        --deep:     #a78bfa;
        --chat:     #fbbf24;
        --gemini:   #60a5fa;
        --local:    #fbbf24;
        --danger:   #f87171;
        --font:     'Outfit', sans-serif;
        --mono:     'Fira Code', monospace;
      }
      html, body, #root { height:100%; width:100%; background:var(--bg); color:var(--text); font-family:var(--font); -webkit-font-smoothing:antialiased; overflow:hidden; }
      ::-webkit-scrollbar { width:3px; height:3px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:99px; }

      @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes pulse   { 0%,100%{opacity:.25} 50%{opacity:1} }
      @keyframes spin    { to{transform:rotate(360deg)} }
      @keyframes glow    { 0%,100%{opacity:.4} 50%{opacity:1} }

      .msg-in  { animation: fadeUp .3s cubic-bezier(.16,1,.3,1) forwards; }
      .fade-in { animation: fadeIn .25s ease forwards; }
      .dot1 { animation: pulse 1.4s ease infinite; }
      .dot2 { animation: pulse 1.4s ease .18s infinite; }
      .dot3 { animation: pulse 1.4s ease .36s infinite; }

      .mesh {
        position:fixed; inset:0; pointer-events:none; z-index:0;
        background:
          radial-gradient(ellipse 55% 45% at 15% 15%, rgba(0,245,160,0.045) 0%, transparent 70%),
          radial-gradient(ellipse 50% 55% at 85% 85%, rgba(167,139,250,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 40% 35% at 65% 5%,  rgba(251,191,36,0.025) 0%, transparent 70%);
      }

      pre { margin:10px 0; }
      pre code {
        display:block; background:rgba(0,0,0,.55);
        border:1px solid rgba(255,255,255,.07); border-left:2px solid var(--quick);
        border-radius:8px; padding:14px 16px;
        font-family:var(--mono); font-size:12.5px; line-height:1.65;
        overflow-x:auto; color:#9fffd0; white-space:pre;
      }

      .btn-ghost:hover  { background:rgba(255,255,255,0.06) !important; }
      .suggestion:hover { background:var(--surface3) !important; border-color:var(--border2) !important; transform:translateY(-1px); }
      .src-link:hover   { opacity:1 !important; padding-left:14px !important; color:var(--deep) !important; }
      .send-btn:not(:disabled):hover  { filter:brightness(1.12); transform:translateY(-1px); }
      .send-btn:not(:disabled):active { transform:scale(.97); }
      .model-toggle:hover { filter:brightness(1.1); transform:translateY(-1px); }

      @media (max-width: 768px) {
        .sidebar { position:fixed !important; z-index:200; height:100% !important; top:0; left:0; }
        .sb-overlay { display:block !important; }
      }
      @media (max-width: 480px) {
        .topbar-badge { display:none !important; }
        .usage-chips  { gap:4px !important; }
      }
    `}</style>
  );
}

function MessageContent({ text }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div style={{ lineHeight:1.72, fontSize:14.5, fontFamily:"var(--font)" }}>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lang = part.match(/^```(\w+)/)?.[1] || "";
          const code = part.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre key={i}>
              {lang && <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--quick)", marginBottom:6, opacity:.7 }}>{lang}</div>}
              <code>{code}</code>
            </pre>
          );
        }
        const bolds = part.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i} style={{ whiteSpace:"pre-wrap" }}>
            {bolds.map((b, j) =>
              b.startsWith("**") && b.endsWith("**")
                ? <strong key={j} style={{ color:"#fff", fontWeight:600 }}>{b.slice(2,-2)}</strong>
                : b
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function App() {
  const [mode, setMode]               = useState("quick");
  const [llmModel, setLlmModel]       = useState("gemini");
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [userId] = useState(() => "u_" + Math.random().toString(36).slice(2,9));
  const bottomRef = useRef();
  const active      = MODES[mode];
  const activeModel = MODELS[llmModel];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const send = useCallback(async (overrideText, overrideMode) => {
    const text = overrideText || input;
    const m    = overrideMode  || mode;
    if (!text.trim() || loading) return;
    if (overrideMode) setMode(overrideMode);
    if (window.innerWidth <= 768) setSidebarOpen(false);
    setMessages(p => [...p, { role:"user", text, mode:m, model:llmModel }]);
    setInput("");
    setLoading(true);

    const ep  = m === "chat" ? "/chat" : `/research/${m}`;
    const key = m === "chat" ? "message" : "query";

    try {
      const res  = await fetch(API + ep, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ [key]:text, userId, model: llmModel }),
      });
      const data = await res.json();
      setMessages(p => [...p, {
        role:"assistant", text: data.reply||data.report||"No response.",
        mode:m, model:llmModel,
        sources:data.sources||[], subQuestions:data.subQuestions||[], usage:data.usage||null,
      }]);
    } catch {
      setMessages(p => [...p, { role:"assistant", text:"⚠ Connection failed. Is the server running on :5000?", mode:m, model:llmModel }]);
    }
    setLoading(false);
  }, [input, mode, loading, userId, llmModel]);

  const handleKey = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      <GlobalStyles />
      <div className="mesh" />
      <div style={{ display:"flex", height:"100vh", position:"relative", zIndex:1, overflow:"hidden" }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="sb-overlay" onClick={() => setSidebarOpen(false)}
            style={{ display:"none", position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:199, backdropFilter:"blur(3px)" }}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside className="sidebar" style={{
          width: sidebarOpen ? 252 : 0, minWidth: sidebarOpen ? 252 : 0,
          overflow:"hidden", transition:"width .28s cubic-bezier(.16,1,.3,1), min-width .28s cubic-bezier(.16,1,.3,1)",
          background:"var(--surface)", borderRight:"1px solid var(--border)",
          display:"flex", flexDirection:"column", flexShrink:0,
        }}>
          <div style={{ width:252, height:"100%", display:"flex", flexDirection:"column" }}>

            {/* Logo */}
            <div style={{ padding:"18px 16px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid var(--border)" }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#00f5a0,#00c8ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🧠</div>
              <div>
                <div style={{ fontWeight:800, fontSize:14.5, letterSpacing:"-0.4px" }}>Manthan.AI</div>
                <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:".6px", marginTop:1 }}>RESEARCH AGENT</div>
              </div>
            </div>

            {/* Model switcher */}
            <div style={{ padding:"14px 12px 10px", borderBottom:"1px solid var(--border)" }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"2px", color:"var(--muted)", marginBottom:8, paddingLeft:4 }}>AI MODEL</div>
              <div style={{ display:"flex", gap:6 }}>
                {Object.entries(MODELS).map(([key, val]) => {
                  const on = llmModel === key;
                  return (
                    <button key={key} className="model-toggle"
                      onClick={() => setLlmModel(key)}
                      style={{
                        flex:1, padding:"9px 8px", borderRadius:9,
                        border:`1px solid ${on ? val.color+"55" : "var(--border)"}`,
                        background: on ? val.glow : "var(--surface2)",
                        color: on ? val.color : "var(--muted)",
                        cursor:"pointer", fontFamily:"var(--font)",
                        transition:"all .18s", display:"flex", flexDirection:"column",
                        alignItems:"center", gap:3,
                      }}
                    >
                      <span style={{ fontSize:16 }}>{val.icon}</span>
                      <span style={{ fontSize:11, fontWeight:700 }}>{val.label}</span>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize:10, color:"var(--muted)", marginTop:7, paddingLeft:2, lineHeight:1.4, opacity:.6 }}>
                {llmModel === "gemini"
                  ? "✦ Gemini 2.0 Flash — fast, accurate"
                  : "⬡ Qwen 2.5 0.5b — local, private, offline"}
              </p>
            </div>

            {/* Mode picker */}
            <div style={{ padding:"14px 10px 10px" }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"2px", color:"var(--muted)", marginBottom:8, paddingLeft:6 }}>MODE</div>
              {Object.entries(MODES).map(([key, val]) => {
                const on = mode === key;
                return (
                  <button key={key}
                    onClick={() => { setMode(key); if(window.innerWidth<=768)setSidebarOpen(false); }}
                    style={{
                      display:"flex", alignItems:"center", gap:11, width:"100%",
                      padding:"10px 12px", borderRadius:10, border:"none", marginBottom:2,
                      background: on ? val.glow : "transparent",
                      boxShadow: on ? `inset 0 0 0 1px ${val.color}25` : "none",
                      color: on ? val.color : "var(--muted)",
                      cursor:"pointer", textAlign:"left",
                      transition:"all .15s", opacity: on ? 1 : 0.72,
                      fontFamily:"var(--font)",
                    }}
                  >
                    <span style={{ fontSize:17 }}>{val.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:12.5 }}>{val.label}</div>
                      <div style={{ fontSize:10.5, opacity:.55, marginTop:1 }}>{val.desc}</div>
                    </div>
                    {on && <div style={{ width:5, height:5, borderRadius:"50%", background:val.color, boxShadow:`0 0 7px ${val.color}`, flexShrink:0 }} />}
                  </button>
                );
              })}
            </div>

            <div style={{ height:1, background:"var(--border)", margin:"0 10px" }} />

            {/* Suggestions */}
            <div style={{ padding:"12px 10px", flex:1, overflowY:"auto" }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"2px", color:"var(--muted)", marginBottom:8, paddingLeft:6 }}>TRY THESE</div>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion" onClick={() => send(s.text, s.mode)}
                  style={{
                    display:"block", width:"100%", textAlign:"left",
                    background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:8, padding:"9px 12px", marginBottom:5,
                    color:"var(--muted)", fontSize:12, lineHeight:1.45,
                    cursor:"pointer", transition:"all .18s", fontFamily:"var(--font)",
                  }}
                >
                  <span style={{ color:MODES[s.mode].color, marginRight:5, fontSize:10 }}>{MODES[s.mode].icon}</span>
                  {s.text}
                </button>
              ))}
            </div>

            {/* User + model indicator footer */}
            <div style={{ padding:"11px 14px", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--quick)", animation:"glow 2.5s ease infinite", flexShrink:0 }} />
                <span style={{ fontSize:10.5, color:"var(--muted)", fontFamily:"var(--mono)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{userId}</span>
              </div>
              <span style={{ fontSize:10, color: activeModel.color, fontWeight:700, opacity:.8 }}>
                {activeModel.icon} {activeModel.label}
              </span>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* Topbar */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:"0 14px",
            height:52, borderBottom:"1px solid var(--border)",
            background:"rgba(3,4,10,.88)", backdropFilter:"blur(18px)", flexShrink:0,
          }}>
            <button className="btn-ghost" onClick={() => setSidebarOpen(o => !o)}
              style={{ width:34, height:34, borderRadius:8, border:"none", background:"transparent", color:"var(--muted)", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background .15s", cursor:"pointer" }}
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>

            <div className="topbar-badge" style={{ display:"flex", alignItems:"center", gap:7, background:active.glow, border:`1px solid ${active.color}30`, borderRadius:20, padding:"4px 13px" }}>
              <span style={{ fontSize:13 }}>{active.icon}</span>
              <span style={{ fontSize:11.5, fontWeight:700, color:active.color }}>{active.label} Mode</span>
            </div>

            {/* Model badge in topbar */}
            <div style={{ display:"flex", alignItems:"center", gap:6, background:activeModel.glow, border:`1px solid ${activeModel.color}30`, borderRadius:20, padding:"4px 12px", cursor:"pointer" }}
              onClick={() => setLlmModel(m => m === "gemini" ? "local" : "gemini")}
            >
              <span style={{ fontSize:12 }}>{activeModel.icon}</span>
              <span style={{ fontSize:11, fontWeight:700, color:activeModel.color }}>{activeModel.label}</span>
            </div>

            <div style={{ flex:1 }} />

            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--quick)", animation:"glow 2s infinite" }} />
              <span style={{ fontSize:11, color:"var(--muted)" }}>Live</span>
            </div>

            {messages.length > 0 && (
              <button className="btn-ghost" onClick={() => setMessages([])}
                style={{ padding:"5px 11px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:11, cursor:"pointer", transition:"background .15s", fontFamily:"var(--font)" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px 14px", display:"flex", flexDirection:"column", gap:20 }}>

            {messages.length === 0 && (
              <div className="fade-in" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, textAlign:"center", padding:"32px 16px" }}>
                <div style={{ position:"relative", marginBottom:24 }}>
                  <div style={{ width:68, height:68, borderRadius:18, background:"linear-gradient(135deg,rgba(0,245,160,.12),rgba(167,139,250,.12))", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>🧠</div>
                  <div style={{ position:"absolute", inset:-2, borderRadius:18, background:"linear-gradient(135deg,var(--quick),var(--deep))", opacity:.12, filter:"blur(14px)", zIndex:-1 }} />
                </div>
                <h1 style={{ fontSize:"clamp(20px,5vw,28px)", fontWeight:800, letterSpacing:"-0.8px", marginBottom:8 }}>Manthan.AI</h1>
                <p style={{ color:"var(--muted)", fontSize:13.5, lineHeight:1.65, maxWidth:340, marginBottom:10 }}>
                  Research agent with persistent memory.<br />Switch modes and models freely.
                </p>
                {/* Model indicator on empty state */}
                <div style={{ display:"flex", alignItems:"center", gap:6, background:activeModel.glow, border:`1px solid ${activeModel.color}33`, borderRadius:20, padding:"5px 14px", marginBottom:28 }}>
                  <span style={{ fontSize:13 }}>{activeModel.icon}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:activeModel.color }}>Using {activeModel.label}</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:480 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="suggestion" onClick={() => send(s.text, s.mode)}
                      style={{
                        background:"var(--surface)", border:"1px solid var(--border)",
                        borderRadius:10, padding:"10px 14px", color:"var(--text)",
                        fontSize:12.5, cursor:"pointer", transition:"all .2s",
                        fontFamily:"var(--font)", textAlign:"left", maxWidth:220,
                      }}
                    >
                      <div style={{ color:MODES[s.mode].color, fontSize:10.5, fontWeight:700, marginBottom:4, letterSpacing:.4 }}>
                        {MODES[s.mode].icon} {MODES[s.mode].label.toUpperCase()}
                      </div>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const mc   = MODES[msg.mode] || active;
              const mdl  = MODELS[msg.model] || activeModel;
              const isUser = msg.role === "user";
              return (
                <div key={i} className="msg-in" style={{ display:"flex", gap:9, justifyContent: isUser ? "flex-end" : "flex-start", alignItems:"flex-start" }}>
                  {!isUser && (
                    <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, marginTop:2, background:mc.glow, border:`1px solid ${mc.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                      {mc.icon}
                    </div>
                  )}

                  <div style={{ maxWidth: isUser ? "74%" : "82%", display:"flex", flexDirection:"column", gap:7, minWidth:0 }}>
                    {!isUser && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:1 }}>
                        <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:"1.2px", color:mc.color }}>
                          {mc.label.toUpperCase()} MODE
                        </span>
                        <span style={{ fontSize:9, color:mdl.color, opacity:.7, fontWeight:600 }}>
                          · {mdl.icon} {mdl.label}
                        </span>
                      </div>
                    )}

                    <div style={{
                      padding:"12px 15px",
                      background: isUser ? `linear-gradient(135deg,${mc.color}16,${mc.color}07)` : "var(--surface)",
                      border:`1px solid ${isUser ? mc.color+"28" : "var(--border)"}`,
                      borderRadius: isUser ? "15px 4px 15px 15px" : "4px 15px 15px 15px",
                      wordBreak:"break-word",
                    }}>
                      <MessageContent text={msg.text} />
                    </div>

                    {msg.subQuestions?.length > 0 && (
                      <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:9, padding:"9px 13px" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"var(--deep)", letterSpacing:".8px", marginBottom:5 }}>◎ SUB-QUESTIONS</div>
                        {msg.subQuestions.map((q, j) => (
                          <div key={j} style={{ fontSize:12, color:"var(--muted)", padding:"2px 0", display:"flex", gap:6 }}>
                            <span style={{ color:"var(--deep)", opacity:.5 }}>↳</span>{q}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.sources?.length > 0 && (
                      <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:9, padding:"9px 13px" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"var(--quick)", letterSpacing:".8px", marginBottom:5 }}>⚡ SOURCES</div>
                        {msg.sources.map((src, j) => (
                          <a key={j} href={src.url} target="_blank" rel="noreferrer" className="src-link"
                            style={{ display:"block", fontSize:12, color:"var(--muted)", textDecoration:"none", padding:"2px 0", paddingLeft:8, opacity:.7, transition:"all .15s" }}
                          >↗ {src.title}</a>
                        ))}
                      </div>
                    )}

                    {msg.usage && (
                      <div className="usage-chips" style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {[
                          { t:`⏱ ${msg.usage.latency}` },
                          { t:`◈ ${msg.usage.totalTokens} tok` },
                          { t:`◇ ${msg.usage.formattedCost}` },
                          { t: msg.usage.latencyOk ? "✓ On time" : "⚠ Slow", c: msg.usage.latencyOk ? "var(--quick)" : "var(--danger)" },
                        ].map((chip, j) => (
                          <span key={j} style={{ fontSize:10, fontFamily:"var(--mono)", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:20, padding:"3px 9px", color:chip.c||"var(--muted)" }}>
                            {chip.t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, marginTop:2, background:"var(--surface2)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                      👤
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="msg-in" style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:active.glow, border:`1px solid ${active.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                  {active.icon}
                </div>
                <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"4px 15px 15px 15px", padding:"13px 16px", display:"flex", alignItems:"center", gap:9 }}>
                  <span style={{ fontSize:12, color:active.color, fontFamily:"var(--mono)", opacity:.8 }}>
                    {mode==="deep" ? "deep researching" : mode==="quick" ? "searching" : "thinking"}
                  </span>
                  <span style={{ fontSize:10, color:activeModel.color, opacity:.6 }}>· {activeModel.icon} {activeModel.label}</span>
                  {[0,1,2].map(k => <div key={k} className={`dot${k+1}`} style={{ width:5, height:5, borderRadius:"50%", background:active.color }} />)}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── INPUT ── */}
          <div style={{ padding:"10px 14px 13px", background:"rgba(3,4,10,.92)", backdropFilter:"blur(20px)", borderTop:"1px solid var(--border)", flexShrink:0 }}>
            <div style={{
              background:"var(--surface)", borderRadius:13,
              border:`1px solid ${loading ? active.color+"44" : "var(--border2)"}`,
              transition:"border-color .2s", overflow:"hidden",
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Ask in ${active.label} mode via ${activeModel.label}… (↵ send)`}
                rows={2}
                style={{
                  width:"100%", background:"transparent", border:"none",
                  padding:"12px 15px 6px", color:"var(--text)",
                  fontSize:14, resize:"none", fontFamily:"var(--font)",
                  lineHeight:1.6, outline:"none",
                }}
              />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 10px 8px", flexWrap:"wrap", gap:6 }}>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {/* Mode tabs */}
                  {Object.entries(MODES).map(([key, val]) => {
                    const on = mode === key;
                    return (
                      <button key={key} onClick={() => setMode(key)}
                        style={{
                          padding:"4px 10px", borderRadius:20,
                          border:`1px solid ${on ? val.color+"44" : "transparent"}`,
                          background: on ? val.glow : "transparent",
                          color: on ? val.color : "var(--muted)",
                          fontSize:11, fontWeight:700, cursor:"pointer",
                          fontFamily:"var(--font)", transition:"all .15s", letterSpacing:".3px",
                        }}
                      >
                        {val.icon} {val.label}
                      </button>
                    );
                  })}

                  {/* Divider */}
                  <div style={{ width:1, background:"var(--border)", margin:"0 2px" }} />

                  {/* Model tabs */}
                  {Object.entries(MODELS).map(([key, val]) => {
                    const on = llmModel === key;
                    return (
                      <button key={key} onClick={() => setLlmModel(key)}
                        style={{
                          padding:"4px 10px", borderRadius:20,
                          border:`1px solid ${on ? val.color+"44" : "transparent"}`,
                          background: on ? val.glow : "transparent",
                          color: on ? val.color : "var(--muted)",
                          fontSize:11, fontWeight:700, cursor:"pointer",
                          fontFamily:"var(--font)", transition:"all .15s",
                        }}
                      >
                        {val.icon} {val.label}
                      </button>
                    );
                  })}
                </div>

                <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}
                  style={{
                    padding:"7px 18px", borderRadius:9, border:"none",
                    background: input.trim() && !loading ? active.color : "var(--surface3)",
                    color: input.trim() && !loading ? "#000" : "var(--muted)",
                    fontWeight:700, fontSize:13, fontFamily:"var(--font)",
                    cursor: input.trim() && !loading ? "pointer" : "default",
                    transition:"all .18s", display:"flex", alignItems:"center", gap:6, flexShrink:0,
                  }}
                >
                  {loading
                    ? <span style={{ width:13, height:13, border:"2px solid rgba(0,0,0,.4)", borderTopColor:"#000", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
                    : "Send ↑"
                  }
                </button>
              </div>
            </div>
            <p style={{ textAlign:"center", fontSize:10, color:"var(--muted)", marginTop:7, opacity:.4 }}>
              {activeModel.icon} {activeModel.label} · Memory persists · Powered by Qdrant
            </p>
          </div>
        </main>
      </div>
    </>
  );
}