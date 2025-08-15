/** quick note: renders the chat messages and input with quick reply support. simple layout with scroll-to-bottom. */
import { useEffect, useRef, useState } from "react";
import ChatMessage from "../components/ChatMessage.jsx";
import ChatInput from "../components/ChatInput.jsx";

export default function ChatPage({ messages, onSend, prefill, version }) {
  const boxRef = useRef(null);
  const [nextOptions, setNextOptions] = useState([]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  // Extract next options from the last assistant message
  useEffect(() => {
    const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMsg && lastAssistantMsg.content) {
      // Look for next options in the message content (this is a simple approach)
      // In a more sophisticated implementation, you might store next options separately
      const content = lastAssistantMsg.content;
      if (content.includes('yes') || content.includes('confirm')) {
        setNextOptions(['yes', 'confirm']);
      } else if (content.includes('no') || content.includes('cancel')) {
        setNextOptions(['no', 'cancel']);
      } else {
        setNextOptions([]);
      }
    } else {
      setNextOptions([]);
    }
  }, [messages]);

  const handleQuickReply = (option) => {
    onSend(option);
    setNextOptions([]);
  };

  return (
    <>
      <div ref={boxRef} className="messages">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
      </div>
      
      {/* Quick reply buttons */}
      {nextOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-3 px-4">
          {nextOptions.map(opt => (
            <button 
              key={opt} 
              onClick={() => handleQuickReply(opt)}
              className="px-3 py-1 border rounded hover:bg-gray-50 text-sm"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      
      <ChatInput onSend={onSend} initialText={prefill} />
    </>
  );
}
