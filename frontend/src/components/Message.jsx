import ReactMarkdown from "react-markdown";

export default function Message({ role, content, isStreaming }) {
  const isUser = role === "user";

  return (
    <div style={{ ...styles.wrapper, ...(isUser ? styles.wrapperUser : {}) }}>
      {/* Avatar */}
      <div style={{ ...styles.avatar, ...(isUser ? styles.avatarUser : styles.avatarBot) }}>
        {isUser ? "U" : "✦"}
      </div>

      {/* Bubble */}
      <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleBot) }}>
        {isUser ? (
          <p style={styles.userText}>{content}</p>
        ) : (
          <div className="markdown-body" style={{ color: "var(--text)" }}>
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
    width: 32, height: 32, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
    letterSpacing: "-0.02em",
  },
  avatarUser: {
    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
    color: "#fff",
  },
  avatarBot: {
    background: "var(--bg-3)",
    border: "1px solid var(--border)",
    color: "var(--accent)",
    fontSize: 16,
  },
  bubble: {
    padding: "12px 16px",
    borderRadius: "var(--radius)",
    maxWidth: "calc(100% - 48px)",
    wordBreak: "break-word",
  },
  bubbleUser: {
    background: "linear-gradient(135deg, var(--accent), #7c3aed)",
    color: "#fff",
  },
  bubbleBot: {
    background: "var(--bg-3)",
    border: "1px solid var(--border)",
  },
  userText: { fontSize: "0.925rem", lineHeight: 1.6, color: "#fff" },
  cursor: {
    display: "inline-block",
    color: "var(--accent)",
    animation: "blink 0.8s step-start infinite",
    marginLeft: 2,
  },
};
