/** quick note: renders individual chat messages. handles user vs assistant styling. */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({ role, content }) {
  const isUser = role === "user";
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const renderContent = () => {
    if (isUser) {
      return <div>{content}</div>;
    }
    
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && inline;
            
            if (isInline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            
            return (
              <div className="code-block-container">
                <pre className="code-block">
                  <code className={className} {...props}>{children}</code>
                </pre>
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(String(children))}
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`bubble ${isUser ? "user" : ""}`}>
      <div className="meta">{isUser ? "You" : "Assistant"}</div>
      {renderContent()}
    </div>
  );
}
