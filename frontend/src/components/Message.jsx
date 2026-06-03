import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";

export default function Message({ role, content, isStreaming }) {
  const isUser = role === "user";

  return (
    <div style={{ ...styles.wrapper, ...(isUser ? styles.wrapperUser : {}) }}>
      {/* Avatar */}
      <div
        style={{
          ...styles.avatar,
          ...(isUser ? styles.avatarUser : styles.avatarBot),
        }}
      >
        {/* ✨ NEW: Swapped the text characters for polished UI icons */}
        {isUser ? <User size={16} /> : <Bot size={18} />}
      </div>

      {/* Bubble */}
      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.bubbleUser : styles.bubbleBot),
        }}
      >
        {isUser ? (
          <p style={styles.userText}>{content}</p>
        ) : (
          <div
            className="markdown-body"
            style={{ color: "var(--text-primary)" }}
          >
            <ReactMarkdown>{content || (isStreaming ? "▋" : "")}</ReactMarkdown>
          </div>
        )}
        {isStreaming && !isUser && content && (
          <span style={styles.cursor}>▋</span>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    maxWidth: 780,
    width: "100%",
    animation: "fadeUp 0.25s ease",
  },
  wrapperUser: {
    flexDirection: "row-reverse",
    alignSelf: "flex-end",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarUser: {
    background: "linear-gradient(135deg, var(--accent-color), #7c3aed)",
    color: "#fff",
  },
  avatarBot: {
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    color: "var(--accent-color)", // This gives the bot icon your theme's blue color
  },
  bubble: {
    padding: "12px 16px",
    borderRadius: "16px",
    maxWidth: "calc(100% - 48px)",
    wordBreak: "break-word",
  },
  bubbleUser: {
    background: "linear-gradient(135deg, var(--accent-color), #7c3aed)",
    color: "#fff",
    borderTopRightRadius: "4px", // Makes it look like a chat bubble
  },
  bubbleBot: {
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderTopLeftRadius: "4px", // Makes it look like a chat bubble
  },
  userText: { fontSize: "15px", lineHeight: 1.6, color: "#fff", margin: 0 },
  cursor: {
    display: "inline-block",
    color: "var(--accent-color)",
    animation: "blink 0.8s step-start infinite",
    marginLeft: 2,
  },
};
