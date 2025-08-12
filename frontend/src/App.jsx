import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import { loadChats, createChat, updateChat, getChat } from "./state/chatStore.js";
import { askBackend } from "./lib/api.js";

export default function App() {
  const [chats, setChats] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [prefill, setPrefill] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [version, setVersion] = useState(localStorage.getItem("fixVersion") || "4.4");

  // init
  useEffect(() => {
    const existing = loadChats();
    if (existing.length === 0) {
      const first = createChat();
      setChats(loadChats());
      setCurrentId(first.id);
    } else {
      setChats(existing);
      setCurrentId(existing[0].id);
    }
  }, []);
  
  useEffect(() => { localStorage.setItem("fixVersion", version); }, [version]);

  // Development health check
  useEffect(() => {
    if (import.meta.env.DEV) {
      fetch((import.meta.env.VITE_API_BASE || "http://localhost:4000") + "/health")
        .then(r => r.json())
        .then(j => console.log("[health]", j))
        .catch(e => console.warn("[health] failed", e));
    }
  }, []);

  const current = currentId ? getChat(currentId) : null;
  const sync = () => setChats(loadChats());

  const onNewChat = () => {
    const c = createChat();
    setCurrentId(c.id);
    setPrefill("");
    sync();
  };

  const onSelectChat = (id) => {
    setCurrentId(id);
    setPrefill("");
    setMobileOpen(false);
    sync();
  };

  const onPickSample = (q) => {
    setPrefill(q);
    setMobileOpen(false);
  };

  const onSend = async (text) => {
    // 1) Add user message immediately
    updateChat(currentId, (c) => {
      const title = c.title === "New chat" ? text.slice(0, 40) : c.title;
      return { ...c, title, messages: [...c.messages, { role: "user", content: text, ts: Date.now() }] };
    });
    sync();
    
    // 2) Add typing indicator
    updateChat(currentId, (c) => ({
      ...c,
      messages: [...c.messages, { role: "assistant", content: "…", typing: true, ts: Date.now() }]
    }));
    sync();

    // 3) Try backend first
    console.log("[Chat] POST /ask …");
    const data = await askBackend({ query: text, version });

    // 4) Replace typing with backend response or fallback
    updateChat(currentId, (c) => {
      const withoutTyping = c.messages.filter(x => !x.typing);
      if (data) {
        return {
          ...c,
          messages: [
            ...withoutTyping,
            {
              role: "assistant",
              content: `${data.answer}\n\n_Sources:_ ${data.citations.map(c => c.title).join(", ")}`,
              ts: Date.now()
            }
          ]
        };
      } else {
        // Fallback to placeholder
        return {
          ...c,
          messages: [
            ...withoutTyping,
            {
              role: "assistant",
              content: `Placeholder answer (local fallback). You asked: "${text}". (FIX ${version})`,
              ts: Date.now()
            }
          ]
        };
      }
    });
    sync();
  };

  return (
    <div className="container">
      {/* Desktop sidebar (left) */}
      <aside className="sidebar desktop">
        <div className="brand">FIX Knowledge Base</div>
        <Sidebar
          chats={chats}
          currentChatId={currentId}
          onSelectChat={onSelectChat}
          onNewChat={onNewChat}
          onPickSample={onPickSample}
        />
      </aside>

      {/* Main content */}
      <div className="main">
        <div className="header">
          <div className="left">
            <button className="toggle" onClick={() => setMobileOpen(true)}>☰</button>
            <div style={{ fontWeight: 600 }}>Chat</div>
            <select value={version} onChange={e => setVersion(e.target.value)}>
              <option value="4.0">FIX 4.0</option>
              <option value="4.2">FIX 4.2</option>
              <option value="4.4">FIX 4.4</option>
              <option value="5.0">FIX 5.0</option>
            </select>
          </div>
          <div style={{ opacity: .7, fontSize: 14 }}>FIX AI Assistant</div>
        </div>

        <div className="content">
          {current && (
            <ChatPage messages={current.messages} onSend={onSend} prefill={prefill} version={version} />
          )}
        </div>
      </div>

      {/* Mobile slide-in sidebar */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="sidebar mobile" onClick={(e) => e.stopPropagation()}>
            <div className="brand">FIX Knowledge Base</div>
            <Sidebar
              chats={chats}
              currentChatId={currentId}
              onSelectChat={onSelectChat}
              onNewChat={onNewChat}
              onPickSample={onPickSample}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
