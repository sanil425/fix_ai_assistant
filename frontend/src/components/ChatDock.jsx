import { useEffect, useMemo, useRef, useState } from "react";
import { sendChat } from "../lib/chatClient";

function resultBadge(result) {
  if (!result) return null;
  const parts = [];
  if (result.type) parts.push(`type=${result.type}`);
  if (typeof result.valid === "boolean") parts.push(`valid=${result.valid}`);
  return parts.length ? parts.join(" · ") : null;
}

export default function ChatDock({ open, onClose, versionProp }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role, text, raw}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextOptions, setNextOptions] = useState([]);
  const [showRaw, setShowRaw] = useState(false);
  const endRef = useRef(null);

  const fixVersion = versionProp || localStorage.getItem("fixVersion") || "4.4";
  const placeholder = useMemo(() => `try: "buy 100 aapl limit 187.5 id t1"`, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, nextOptions]);

  async function doSend({ userText, next } = {}) {
    const text = (userText ?? input).trim();
    if (!text) return;
    setError("");
    setLoading(true);
    setNextOptions([]);

    // Prefix a light directive so router/LLM knows version
    const versioned = `[fix:${fixVersion}] ${text}`;

    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const resp = await sendChat({ message: versioned, next });
      const mainText =
        resp?.narration?.text ||
        resp?.explanation ||
        resp?.message ||
        JSON.stringify(resp, null, 2);

      const badge = resultBadge(resp?.result);
      const display = badge ? `${mainText}\n\n— ${badge}` : mainText;

      setMessages((m) => [...m, { role: "assistant", text: display, raw: resp }]);

      if (Array.isArray(resp?.next) && resp.next.length) setNextOptions(resp.next);
      else setNextOptions([]);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.35)", display: "flex", justifyContent: "flex-end"
    }}>
      <div style={{
        width: "420px", maxWidth: "90vw", height: "100%", background: "#111",
        color: "#eee", boxShadow: "-4px 0 24px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column"
      }}>
        <header style={{ padding: "12px 14px", borderBottom: "1px solid #222", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>FIX Chat</div>
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
            Version: <code>{fixVersion}</code>
          </div>
          <button onClick={() => setShowRaw(v => !v)} style={{ fontSize: 12, marginLeft: 8 }}>
            {showRaw ? "Hide raw" : "Show raw"}
          </button>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: 8, fontSize: 16 }}>✕</button>
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {messages.length === 0 && (
            <div style={{ color: "#aaa", fontSize: 13 }}>Ask something like: <code>{placeholder}</code></div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: m.role === "user" ? "#7fb3ff" : "#9fdb9f" }}>
                {m.role.toUpperCase()}
              </div>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, margin: 0 }}>{m.text}</pre>
              {showRaw && m.role === "assistant" && m.raw && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>raw</summary>
                  <pre style={{ maxHeight: 240, overflow: "auto", fontSize: 11 }}>
                    {JSON.stringify(m.raw, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </main>

        {!!nextOptions.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "4px 12px 8px" }}>
            {nextOptions.map(opt => (
              <button key={opt} onClick={() => doSend({ userText: opt, next: opt })}
                style={{ padding: "6px 10px", border: "1px solid #333", background: "#1a1a1a", color: "#eee", borderRadius: 6 }}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ color: "#ff6b6b", background: "#2a1212", padding: 8, margin: "0 12px 8px", borderRadius: 6, fontSize: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); doSend(); }} style={{ display: "flex", gap: 8, padding: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, padding: "10px 12px", background: "#0d0d0d", color: "#eee",
                     border: "1px solid #2a2a2a", borderRadius: 8 }}
          />
          <button disabled={loading}
            style={{ padding: "10px 14px", border: "1px solid #2a2a2a", background: "#fff", color: "#000", borderRadius: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
