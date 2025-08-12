export default function Sidebar({
  chats = [],
  currentChatId,
  onSelectChat,
  onNewChat,
  onPickSample
}) {
  const samples = [
    "What is the FIX Protocol?",
    "Explain tag 35 (MsgType).",
    "How do I send a New Order Single (35=D)?",
    "FIX 4.2 vs 4.4 — key differences",
    "List fields in Execution Report (35=8).",
  ];
  const links = [
    { label: "FIX Trading Community", href: "https://www.fixtrading.org/" },
    { label: "FIXimate (Field Dictionary)", href: "https://www.onixs.biz/fix-dictionary.html" },
    { label: "Wikipedia: FIX", href: "https://en.wikipedia.org/wiki/Financial_Information_eXchange" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand" style={{fontSize: "1.1rem", marginBottom: "24px"}}>FIX Knowledge Base</div>

      {/* Recent Chats Section */}
      <details open className="sidebar-accordion">
        <summary className="accordion-summary">Recent Chats</summary>
        <div className="card list">
          <button onClick={onNewChat} style={{fontSize: "0.9rem"}}>＋ New chat</button>
          {chats.length === 0 && <div style={{opacity:.6, padding:"8px 10px", fontSize: "0.85rem"}}>No chats yet</div>}
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectChat(c.id)}
              style={{
                borderColor: c.id === currentChatId ? "#33465f" : "transparent",
                background: c.id === currentChatId ? "#1b2230" : "transparent",
                fontSize: "0.85rem"
              }}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </div>
      </details>

      {/* Sample Questions Section */}
      <details open className="sidebar-accordion">
        <summary className="accordion-summary">Sample Questions</summary>
        <div className="card list">
          {samples.map((q) => (
            <button key={q} onClick={() => onPickSample(q)} style={{fontSize: "0.85rem"}}>{q}</button>
          ))}
        </div>
      </details>

      {/* Official Resources Section */}
      <details open={accordionState.resources} className="sidebar-accordion" onToggle={() => handleAccordionToggle("resources")}>
        <summary className="accordion-summary">Official Resources</summary>
        <div className="card list">
          {links.map((l) => (
            <a key={l.href} className="link" href={l.href} target="_blank" rel="noreferrer" style={{fontSize: "0.85rem"}}>
              {l.label}
            </a>
          ))}
        </div>
      </details>

      <div className="section-title" style={{marginTop: "auto", fontSize: "0.75rem", opacity: 0.7}}>Prototype • Local only</div>
    </aside>
  );
}
