export default function ChatMessage({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`bubble ${isUser ? "user" : ""}`}>
      <div className="meta">{isUser ? "You" : "Assistant"}</div>
      <div>{content}</div>
    </div>
  );
}
