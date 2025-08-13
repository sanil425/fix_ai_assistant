import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import BottomToolbar from "./components/BottomToolbar";
import "./styles/design.css";
import "./styles/bottom-toolbar.css";
// TEMP: AI disabled for demo; re-enable by restoring ChatDock and askAI usage
// import ChatDock from "./components/ChatDock.jsx";
// import { loadChats, createChat, updateChat, getChat } from "./state/chatStore.js";
// import { askBackend } from "./lib/api.js";

export default function App() {
  const [version, setVersion] = useState(localStorage.getItem("fixVersion") || "4.4");
  const [chats, setChats] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [prefill, setPrefill] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  
  useEffect(() => { localStorage.setItem("fixVersion", version); }, [version]);

  // init
  useEffect(() => {
    // Create a default chat if none exist
    if (chats.length === 0) {
      const first = { id: "1", title: "New chat", messages: [] };
      setChats([first]);
      setCurrentId(first.id);
    }
  }, [chats.length]);
  
  const [current, setCurrent] = useState(null);
  
  // Update current chat when chats or currentId changes
  useEffect(() => {
    const found = chats.find(c => c.id === currentId);
    setCurrent(found);
  }, [chats, currentId]);
  
  const onNewChat = () => {
    const c = { id: Date.now().toString(), title: "New chat", messages: [] };
    setChats([c, ...chats]);
    setCurrentId(c.id);
    setPrefill("");
  };

  const onSelectChat = (id) => {
    setCurrentId(id);
    setPrefill("");
    setMobileOpen(false);
  };

  const onPickSample = (q) => {
    setPrefill(q);
    setMobileOpen(false);
  };

  const onSend = async (text) => {
    if (!current) return;
    
    // 1) Add user message immediately
    const updatedChats = chats.map(c => 
      c.id === currentId 
        ? { ...c, title: c.title === "New chat" ? text.slice(0, 40) : c.title, messages: [...c.messages, { role: "user", content: text, ts: Date.now() }] }
        : c
    );
    setChats(updatedChats);
    
    // 2) Add typing indicator
    const withTyping = updatedChats.map(c => 
      c.id === currentId 
        ? { ...c, messages: [...c.messages, { role: "assistant", content: "…", typing: true, ts: Date.now() }] }
        : c
    );
    setChats(withTyping);

    // 3) Replace typing with canned reply after delay
    setTimeout(() => {
      const canned = [
        "Demo mode: no AI connected. This is a placeholder answer.",
        "This is a placeholder response. Scroll down to use the FIX toolbar.",
        "Static response (offline)."
      ];
      const reply = canned[Math.floor(Math.random() * canned.length)];
      
      setChats(prevChats => prevChats.map(c => 
        c.id === currentId 
          ? { ...c, messages: c.messages.filter(m => !m.typing).concat([{ role: "assistant", content: reply, ts: Date.now() }]) }
          : c
      ));
    }, 300);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left: Sidebar */}
      <div style={{ flex: "0 0 280px", minWidth: 0 }}>
        <div className="container">
          {/* Desktop sidebar (left) */}
          <aside className="sidebar desktop">
            <Sidebar
              chats={chats}
              currentChatId={currentId}
              onSelectChat={onSelectChat}
              onNewChat={onNewChat}
              onPickSample={onPickSample}
            />
          </aside>

          {/* Mobile slide-in sidebar */}
          {mobileOpen && (
            <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
              <aside className="sidebar mobile" onClick={(e) => e.stopPropagation()}>
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
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
            <div className="right">
              <span className="text-zinc-400 text-sm">FIX Builder</span>
            </div>
          </div>

          <div className="content">
            {current && (
              <ChatPage messages={current.messages} onSend={onSend} prefill={prefill} version={version} />
            )}
          </div>

          {/* FIX Toolbar embedded at bottom */}
          <div className="mx-auto max-w-6xl px-4 py-6 space-y-8" style={{ borderTop: '1px solid #374151', marginTop: '2rem' }}>
            <BottomToolbar variant="inline" />
          </div>
        </div>
      </div>
    </div>
  );
}
