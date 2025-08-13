import { useState } from "react";
import { askAI } from "../lib/api";

export default function ChatDock({ fixVersion = "4.4", getDraftFix }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]); // {role:"user"|"assistant", content:string}

  async function onSend(e) {
    e.preventDefault();
    const userPrompt = input.trim();
    if (!userPrompt) return;
    const draftFix = typeof getDraftFix === "function" ? getDraftFix() : null;

    setMessages((m) => [...m, { role: "user", content: userPrompt }]);
    setInput("");
    setLoading(true);
    try {
      const res = await askAI({ userPrompt, fixVersion, draftFix });
      const { answer, action } = res;

      // show assistant text
      setMessages((m) => [...m, { role: "assistant", content: answer }]);

      // broadcast action for optional listeners (builder/blotter)
      if (action && action.type) {
        window.dispatchEvent(new CustomEvent("fix:aiAction", { detail: action }));
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ Error: ${err?.message || err}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderLeft: "1px solid #eee", width: 380, display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: 12, fontWeight: 600 }}>FIX Assistant</div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{m.role === "user" ? "You" : "Assistant"}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && <div>Thinking…</div>}
      </div>
      <form onSubmit={onSend} style={{ padding: 12, borderTop: "1px solid #eee" }}>
        <textarea
          rows={2}
          placeholder="Ask about FIX or request a message (e.g., 'Build a 100 AAPL limit buy')."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "100%", resize: "vertical" }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ marginTop: 8, width: "100%" }}>
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
