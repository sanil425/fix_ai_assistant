import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import { loadChats, createChat, updateChat, getChat } from "./state/chatStore.js";

export default function App() {
  const [chats, setChats] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [prefill, setPrefill] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [version, setVersion] = useState("4.4");

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

  const onSend = (text) => {
    updateChat(currentId, (c) => {
      const title = c.title === "New chat" ? text.slice(0, 40) : c.title;
      return { ...c, title, messages: [...c.messages, { role: "user", content: text, ts: Date.now() }] };
    });
    sync();
    setTimeout(() => {
      updateChat(currentId, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: `Placeholder answer.\n\nYou asked: "${text}".`, ts: Date.now() }]
      }));
      sync();
    }, 350);
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
          </div>
          <div style={{ opacity: .7, fontSize: 14 }}>FIX AI Assistant</div>
        </div>

        <div className="content">
          {current && (
            <ChatPage messages={current.messages} onSend={onSend} prefill={prefill} />
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
