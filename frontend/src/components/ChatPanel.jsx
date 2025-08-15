import { useEffect, useMemo, useRef, useState } from "react";
import { sendChat } from "../lib/chatClient";

function jsonSummary(result) {
  if (!result) return null;
  // show a tiny summary + a toggle to inspect raw result
  const parts = [];
  if (result.type) parts.push(`type=${result.type}`);
  if (typeof result.valid === "boolean") parts.push(`valid=${result.valid}`);
  return parts.length ? parts.join(" · ") : null;
}

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', text, raw}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextOptions, setNextOptions] = useState([]); // array of strings
  const [version, setVersion] = useState(localStorage.getItem("fixVersion") || "4.4");
  const [showRaw, setShowRaw] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { localStorage.setItem("fixVersion", version); }, [version]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, nextOptions]);

  const placeholder = useMemo(
    () => `try: "buy 100 aapl limit 187.5 id t1"`,
    []
  );

  async function doSend({ userText, next } = {}) {
    const text = (userText ?? input).trim();
    if (!text) return;
    setError("");
    setLoading(true);
    setNextOptions([]);

    // Prefix a light directive so the router/LLM knows the FIX version.
    const versioned = `[fix:${version}] ${text}`;

    setMessages((m) => [...m, { role: "user", text }]);

    try {
      const resp = await sendChat({ message: versioned, next });

      // Primary assistant text: use narrator if present; else stringify fallback
      const assistantText =
        resp?.narration?.text ||
        resp?.explanation ||
        resp?.message ||
        JSON.stringify(resp, null, 2);

      const resultSummary = jsonSummary(resp?.result);
      const decoratedText = resultSummary
        ? `${assistantText}\n\n— ${resultSummary}`
        : assistantText;

      setMessages((m) => [...m, { role: "assistant", text: decoratedText, raw: resp }]);

      // Quick replies
      if (Array.isArray(resp?.next) && resp.next.length) {
        setNextOptions(resp.next);
      } else {
        setNextOptions([]);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doSend();
  }

  return (
    <div className="w-full h-full flex flex-col gap-3 p-4" style={{ maxWidth: 900, margin: "0 auto" }}>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">FIX Chat</h1>
        <div className="grow" />
        <label className="text-sm">
          FIX Version:&nbsp;
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="4.2">4.2</option>
            <option value="4.4">4.4</option>
            <option value="5.0sp2">5.0SP2</option>
          </select>
        </label>
        <button
          className="text-sm underline"
          onClick={() => setShowRaw((v) => !v)}
          title="Toggle raw JSON for last response"
        >
          {showRaw ? "Hide raw" : "Show raw"}
        </button>
      </header>

      <main className="flex-1 overflow-auto border rounded p-3 bg-white" style={{ minHeight: 360 }}>
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm">Ask something like: <code>{placeholder}</code></div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="mb-3">
            <div className={`text-xs ${m.role === "user" ? "text-blue-600" : "text-green-700"}`}>
              {m.role.toUpperCase()}
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm">{m.text}</pre>
            {showRaw && m.role === "assistant" && m.raw && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs underline">raw</summary>
                <pre className="text-xs overflow-auto">{JSON.stringify(m.raw, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </main>

      {!!nextOptions.length && (
        <div className="flex flex-wrap gap-2">
          {nextOptions.map((opt) => (
            <button
              key={opt}
              className="px-3 py-1 border rounded hover:bg-gray-50"
              onClick={() => doSend({ userText: opt, next: opt })}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm border rounded p-2 bg-red-50">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="grow border rounded px-3 py-2"
        />
        <button
          disabled={loading}
          className="border rounded px-4 py-2 bg-black text-white disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
