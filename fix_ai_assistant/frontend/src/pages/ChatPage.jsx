import { useEffect, useRef } from "react";
import ChatMessage from "../components/ChatMessage.jsx";
import ChatInput from "../components/ChatInput.jsx";

export default function ChatPage({ messages, onSend, prefill }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  return (
    <>
      <div ref={boxRef} className="messages">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
      </div>
      <ChatInput onSend={onSend} initialText={prefill} />
    </>
  );
}
