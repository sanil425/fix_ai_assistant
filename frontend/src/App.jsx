/** quick note: legacy FIX frontend with integrated chat dock. keeps all existing UI intact. */
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import BottomToolbar from "./components/BottomToolbar";
import ChatDock from "./components/ChatDock";
import { sendChat } from "./lib/chatClient";
import "./styles/design.css";
import "./styles/bottom-toolbar.css";

export default function App() {
  const [version, setVersion] = useState(localStorage.getItem("fixVersion") || "4.4");
  const [chats, setChats] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [prefill, setPrefill] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  useEffect(() => { localStorage.setItem("fixVersion", version); }, [version]); // persist version choice

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

    // 3) Call real backend and replace typing with response
    try {
      const versioned = `[fix:${version}] ${text}`;
      const resp = await sendChat({ message: versioned });

      const main = resp?.narration?.text || resp?.explanation || resp?.message || JSON.stringify(resp, null, 2);
      
      const badgeParts = [];
      if (resp?.result?.type) badgeParts.push(`type=${resp.result.type}`);
      if (typeof resp?.result?.valid === "boolean") badgeParts.push(`valid=${resp.result.valid}`);
      const badge = badgeParts.length ? `\n\n— ${badgeParts.join(" · ")}` : "";
      
      const reply = `${main}${badge}`;
      
      setChats(prevChats => prevChats.map(c => 
        c.id === currentId 
          ? { ...c, messages: c.messages.filter(m => !m.typing).concat([{ role: "assistant", content: reply, ts: Date.now() }]) }
          : c
      ));
    } catch (error) {
      const errorMessage = error.message || "Failed to get response from chat service";
      setChats(prevChats => prevChats.map(c => 
        c.id === currentId 
          ? { ...c, messages: c.messages.filter(m => !m.typing).concat([{ role: "assistant", content: `Error: ${errorMessage}`, ts: Date.now() }]) }
          : c
      ));
    }
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
            <div style={{ opacity: .7, fontSize: 14 }}>FIX Demo</div>
            <div className="right">
              <span className="text-zinc-400 text-sm">FIX Builder</span>
              {/* Chat button added to existing toolbar */}
              <button 
                onClick={() => setChatOpen(true)} 
                title="Open FIX Chat"
                style={{ 
                  marginLeft: "12px", 
                  padding: "6px 12px", 
                  background: "#1f2937", 
                  color: "white", 
                  border: "1px solid #374151", 
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                Chat
              </button>
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

      {/* Chat dock overlay - mounted at the end so it overlays everything */}
      <ChatDock 
        open={chatOpen} 
        onClose={() => setChatOpen(false)} 
        versionProp={version}
      />
    </div>
  );
}
