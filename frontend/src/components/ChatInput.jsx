/** quick note: chat input field with send button. handles Enter key and initial text. */
import { useState } from "react";

export default function ChatInput({ onSend, initialText }) {
  const [text, setText] = useState(initialText || "");
  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
  };
  return (
    <div className="inputbar">
      <form className="form" onSubmit={submit}>
        <input
          className="textbox"
          placeholder="Ask about FIX…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
        />
        <button className="send" type="submit">Send</button>
      </form>
    </div>
  );
}
