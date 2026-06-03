import { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  FileSearch,
  Menu,
  X,
  Upload,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";
import axios from "axios";
import Message from "./components/Message";
import { streamChat } from "./api";

export default function App() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [messages, setMessages] = useState([]);
  const [collectionName, setCollectionName] = useState(null);
  const [chunksInfo, setChunksInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // File Upload State
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✨ NEW: Auto-open sidebar on mobile for new users
  useEffect(() => {
    if (!isReady && window.innerWidth <= 768) {
      setMobileMenuOpen(true);
    }
  }, []); // Runs once on mount

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  // ==========================
  // FILE SELECTION & VALIDATION
  // ==========================
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);

    // STRICT FILTER: Keep only PDF files
    const validPdfs = selectedFiles.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );

    if (validPdfs.length < selectedFiles.length) {
      setUploadError(
        "Only PDF files are allowed. Invalid files were removed from your selection.",
      );
    } else {
      setUploadError(null);
    }

    setFiles(validPdfs);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  // ==========================
  // UPLOAD LOGIC
  // ==========================
  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setUploadError(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("pdfs", file));

    try {
      const res = await axios.post(`${API_BASE_URL}/api/upload`, formData);
      setCollectionName(res.data.collectionName);
      setChunksInfo(res.data.chunksProcessed);
      setIsReady(true);
      setMessages([]);
      setFiles([]); // Clear queue on success
      setMobileMenuOpen(false); // Auto-close menu on success
    } catch (error) {
      const rawError =
        error.response?.data?.error || error.message || "Upload failed";

      if (rawError.length > 150) {
        setUploadError(
          "An unexpected server error occurred while processing your document. Please try a different file.",
        );
      } else {
        setUploadError(rawError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================
  // CHAT LOGIC
  // ==========================
  const handleSend = async () => {
    const question = input.trim();
    if (!question || !isReady || isStreaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      await streamChat(question, collectionName, (delta) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: (updated[updated.length - 1].content || "") + delta,
          };
          return updated;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `❌ Error: ${err.message}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Summarize the key findings",
    "What are the main conclusions?",
    "List all mentioned dates and events",
    "What methodology was used?",
  ];

  return (
    <div className="app-layout">
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar-container ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <h1 className="sidebar-title">
            <FileSearch className="text-accent" /> DocIntel
          </h1>

          <div className="sidebar-upload-section">
            <div className="upload-dropzone">
              <input
                type="file"
                multiple
                accept=".pdf"
                className="file-input-hidden"
                id="file-upload"
                onClick={(e) => {
                  e.target.value = null;
                }}
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload" className="upload-label">
                <Upload className="upload-icon" size={24} />
                <span className="upload-text">
                  Drop PDFs here or click to browse
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="selected-files-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <FileText size={14} className="text-accent" />
                      <span className="file-name">{file.name}</span>
                    </div>
                    <button
                      className="file-remove-btn"
                      onClick={() => removeFile(index)}
                      title="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isProcessing || files.length === 0}
              className="upload-submit-btn"
            >
              {isProcessing && <Loader2 className="spinner" size={16} />}
              {isProcessing ? "Processing..." : "Upload & Process"}
            </button>

            {uploadError && (
              <div className="error-box">
                <p className="error-text">{uploadError}</p>
              </div>
            )}
          </div>
        </div>
        <button
          className="mobile-close-btn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X size={20} />
        </button>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="title-group">
              <Sparkles size={18} className="text-accent" />
              <span className="top-title">PDF Intelligence</span>
            </div>
          </div>

          {chunksInfo && (
            <div className="status-badge">
              <span className="status-dot" />
              <span className="status-text">{chunksInfo} chunks indexed</span>
            </div>
          )}
        </header>

        <div className="messages-area">
          {!isReady && messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                {/* ✨ Changed icon to Upload */}
                <Upload size={28} className="text-accent" />
              </div>
              <h2 className="empty-title">Upload PDFs to begin</h2>
              <p className="empty-subtitle">
                Add your documents to start chatting. Answers will be grounded
                entirely in your files.
              </p>

              {/* ✨ NEW: Mobile Call-to-Action Button ✨ */}
              {!isReady && (
                <button
                  className="mobile-upload-cta"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Upload size={18} />
                  Open Upload Menu
                </button>
              )}

              {/* ✨ NEW: Conditionally hide suggestions on mobile when empty ✨ */}
              <div
                className={`suggestions-grid ${!isReady ? "hide-on-mobile" : ""}`}
              >
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="suggestion-btn"
                    onClick={() => {
                      if (isReady) setInput(s);
                    }}
                    disabled={!isReady}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((msg, i) => (
              <Message
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  msg.role === "assistant"
                }
              />
            ))}
            <div ref={bottomRef} className="scroll-anchor" />
          </div>
        </div>

        <div className="input-wrapper">
          <div className="input-container">
            <div className={`input-box ${!isReady ? "disabled" : ""}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  isReady
                    ? "Ask a question about your documents..."
                    : "Upload PDFs to start chatting..."
                }
                disabled={!isReady || isStreaming}
                rows={1}
                className="chat-textarea"
              />
              <button
                className={`send-btn ${input.trim() && isReady && !isStreaming ? "active" : ""}`}
                onClick={handleSend}
                disabled={!input.trim() || !isReady || isStreaming}
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        :root {
          --bg-main: #0f1115;
          --bg-secondary: #16181d;
          --bg-tertiary: #20242b;
          --border-color: #2b303b;
          --text-primary: #f3f4f6;
          --text-secondary: #9ca3af;
          --text-tertiary: #6b7280;
          --accent-color: #3b82f6;
          --accent-hover: #2563eb;
          --accent-light: rgba(59, 130, 246, 0.15);
          --success-color: #10b981;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: var(--bg-main); color: var(--text-primary); }
        .text-accent { color: var(--accent-color); }
        
        .app-layout { display: flex; height: 100vh; overflow: hidden; background: var(--bg-main); }
        .main-content { flex: 1; display: flex; flex-direction: column; position: relative; }
        
        /* SIDEBAR CSS */
        .sidebar-container { width: 300px; flex-shrink: 0; border-right: 1px solid var(--border-color); background: var(--bg-secondary); z-index: 40; transition: transform 0.3s ease; }
        .sidebar-content { padding: 24px; height: 100%; display: flex; flex-direction: column; }
        .sidebar-title { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; color: var(--text-primary); }
        .sidebar-upload-section { flex: 1; display: flex; flex-direction: column; }
        
        .upload-dropzone { border: 1px dashed var(--border-color); border-radius: 12px; padding: 24px 16px; text-align: center; transition: background 0.2s ease; background: var(--bg-main); margin-bottom: 12px; }
        .upload-dropzone:hover { background: var(--bg-tertiary); }
        .file-input-hidden { display: none; }
        .upload-label { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .upload-icon { color: var(--text-tertiary); }
        .upload-text { font-size: 14px; color: var(--text-secondary); }

        /* SELECTED FILES QUEUE CSS */
        .selected-files-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; max-height: 200px; overflow-y: auto; padding-right: 4px; }
        .selected-files-list::-webkit-scrollbar { width: 4px; }
        .selected-files-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .file-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; }
        .file-info { display: flex; align-items: center; gap: 8px; overflow: hidden; }
        .file-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; color: var(--text-primary); }
        .file-remove-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.2s; padding: 4px; border-radius: 4px; }
        .file-remove-btn:hover { color: #f87171; background: rgba(248, 113, 113, 0.1); }

        .upload-submit-btn { width: 100%; background: var(--accent-color); color: white; padding: 12px; border-radius: 8px; font-weight: 500; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 0.2s; }
        .upload-submit-btn:hover:not(:disabled) { background: var(--accent-hover); }
        .upload-submit-btn:disabled { background: var(--bg-tertiary); color: var(--text-tertiary); cursor: not-allowed; }
        
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .error-box { margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; }
        .error-text { color: #f87171; font-size: 13px; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.5; max-height: 150px; overflow-y: auto; }

        .mobile-close-btn { display: none; position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text-secondary); cursor: pointer; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 30; }

        /* MAIN CONTENT CSS */
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-main); z-index: 10; }
        .top-bar-left { display: flex; align-items: center; gap: 12px; }
        .title-group { display: flex; align-items: center; gap: 8px; }
        .mobile-menu-btn { display: none; background: none; border: none; color: var(--text-secondary); cursor: pointer; }
        .top-title { font-weight: 600; font-size: 15px; }
        .status-badge { display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 999px; font-size: 12px; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success-color); box-shadow: 0 0 8px var(--success-color); }

        .messages-area { flex: 1; overflow-y: auto; scroll-behavior: smooth; }
        .messages-list { padding: 24px 0; display: flex; flex-direction: column; gap: 24px; }
        .scroll-anchor { height: 1px; }

        .empty-state { max-width: 540px; margin: 10vh auto; padding: 0 24px; text-align: center; }
        .empty-icon-wrapper { width: 56px; height: 56px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .empty-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
        .empty-subtitle { font-size: 15px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 32px; }
        
        .suggestions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .suggestion-btn { padding: 14px 16px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-secondary); font-size: 13px; font-weight: 500; text-align: left; cursor: pointer; transition: all 0.2s ease; }
        .suggestion-btn:hover:not(:disabled) { border-color: var(--accent-color); color: var(--text-primary); }
        .suggestion-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .input-wrapper { padding: 0 24px 24px; background: linear-gradient(to top, var(--bg-main) 80%, transparent); position: sticky; bottom: 0; }
        .input-container { max-width: 768px; margin: 0 auto; }
        .input-box { display: flex; align-items: flex-end; gap: 12px; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 16px; transition: border-color 0.2s ease; }
        .input-box:focus-within { border-color: var(--accent-color); }
        .input-box.disabled { opacity: 0.5; }
        .chat-textarea { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-family: inherit; font-size: 15px; line-height: 1.5; resize: none; max-height: 150px; padding: 4px 4px 4px 8px; }
        .send-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: var(--bg-main); color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
        .send-btn.active { background: var(--accent-color); color: white; }

        /* ✨ NEW: Mobile CTA Button Styles ✨ */
        .mobile-upload-cta {
          display: none; /* Hidden by default on desktop */
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--accent-color);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin: 0 auto 32px;
          width: 100%;
          max-width: 260px;
          box-shadow: 0 4px 12px var(--accent-light);
          transition: background 0.2s, transform 0.1s;
        }
        .mobile-upload-cta:hover { background: var(--accent-hover); }
        .mobile-upload-cta:active { transform: scale(0.97); }

        @media (max-width: 768px) {
          /* ✨ Show CTA button on mobile ✨ */
          .mobile-upload-cta {
            display: flex;
          }
          /* ✨ Hide suggestions on mobile until document is ready ✨ */
          .hide-on-mobile {
            display: none;
          }
          
          .sidebar-container { position: fixed; height: 100%; top: 0; left: 0; transform: translateX(-100%); }
          .sidebar-container.open { transform: translateX(0); }
          .sidebar-overlay, .mobile-menu-btn, .mobile-close-btn { display: block; }
          .input-wrapper { padding: 0 16px 16px; }
          .status-text { display: none; }
          .status-badge { padding: 6px; }
        }
      `}</style>
    </div>
  );
}
