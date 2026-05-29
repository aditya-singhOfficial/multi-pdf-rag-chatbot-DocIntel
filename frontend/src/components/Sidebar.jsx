import { useState, useRef } from "react";
import { Upload, FileText, Trash2, CheckCircle, Loader2, AlertCircle, X } from "lucide-react";
import { uploadPDFs } from "../api";

export default function Sidebar({ onReady, onClear, isReady }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf");
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...pdfs.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setStatus("uploading");
    setError("");
    try {
      const result = await uploadPDFs(files, setProgress);
      setStatus("done");
      onReady(result.collectionName, result.chunksProcessed);
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setStatus("idle");
    setProgress("");
    setError("");
    onClear();
  };

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.sidebarHeader}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>✦</div>
          <span style={styles.logoText}>DocIntel</span>
        </div>
        <p style={styles.tagline}>PDF Intelligence</p>
      </div>

      <div style={styles.divider} />

      {/* Upload Zone */}
      <div style={styles.section}>
        <p style={styles.label}>DOCUMENTS</p>

        {!isReady && status !== "done" && (
          <div
            style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={22} style={{ color: "var(--accent)", marginBottom: 8 }} />
            <p style={styles.dropText}>Drop PDFs here</p>
            <p style={styles.dropSub}>or click to browse</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
        )}

        {/* File List */}
        {files.length > 0 && !isReady && (
          <div style={styles.fileList}>
            {files.map((f) => (
              <div key={f.name} style={styles.fileItem}>
                <FileText size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={styles.fileName}>{f.name}</span>
                {status === "idle" && (
                  <button style={styles.removeBtn} onClick={() => removeFile(f.name)}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        {status === "uploading" && (
          <div style={styles.statusBox}>
            <Loader2 size={16} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
            <span style={styles.statusText}>{progress || "Processing..."}</span>
          </div>
        )}

        {status === "error" && (
          <div style={{ ...styles.statusBox, ...styles.errorBox }}>
            <AlertCircle size={16} style={{ color: "var(--error)" }} />
            <span style={{ ...styles.statusText, color: "var(--error)" }}>{error}</span>
          </div>
        )}

        {isReady && (
          <div style={styles.readyBox}>
            <CheckCircle size={16} style={{ color: "var(--success)" }} />
            <span style={{ ...styles.statusText, color: "var(--success)" }}>
              Documents ready
            </span>
          </div>
        )}

        {/* Actions */}
        {files.length > 0 && status === "idle" && !isReady && (
          <button style={styles.processBtn} onClick={handleProcess}>
            <Upload size={14} />
            Process {files.length} file{files.length > 1 ? "s" : ""}
          </button>
        )}

        {isReady && (
          <button style={styles.clearBtn} onClick={handleClear}>
            <Trash2 size={14} />
            Clear & Reset
          </button>
        )}
      </div>

      <div style={styles.divider} />

      {/* Tips */}
      <div style={styles.section}>
        <p style={styles.label}>TIPS</p>
        <div style={styles.tipsList}>
          {["Upload multiple PDFs at once", "Ask specific questions", "Answers cite your docs only"].map((tip) => (
            <div key={tip} style={styles.tip}>
              <span style={styles.tipDot}>›</span>
              <span style={styles.tipText}>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 260,
    minWidth: 260,
    height: "100vh",
    background: "var(--bg-2)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
    overflowY: "auto",
  },
  sidebarHeader: { padding: "0 20px 20px" },
  logo: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  logoIcon: {
    width: 28, height: 28,
    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
    borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 800, color: "#fff",
  },
  logoText: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" },
  tagline: { fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" },
  divider: { height: 1, background: "var(--border)", margin: "0 0 20px" },
  section: { padding: "0 16px 20px" },
  label: { fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-dim)", marginBottom: 10, fontFamily: "var(--font-mono)" },
  dropZone: {
    border: "1.5px dashed var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 12px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "transparent",
    marginBottom: 10,
  },
  dropZoneActive: { borderColor: "var(--accent)", background: "var(--accent-glow)" },
  dropText: { fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 },
  dropSub: { fontSize: 11, color: "var(--text-muted)" },
  fileList: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  fileItem: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "7px 10px",
    background: "var(--bg-3)",
    borderRadius: 8,
    border: "1px solid var(--border)",
  },
  fileName: { fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  removeBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2, borderRadius: 4 },
  statusBox: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg-3)", borderRadius: 8, marginBottom: 10 },
  errorBox: { border: "1px solid rgba(239,68,68,0.2)" },
  readyBox: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(16,185,129,0.08)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", marginBottom: 10 },
  statusText: { fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)", lineHeight: 1.4 },
  processBtn: {
    width: "100%", padding: "10px 14px",
    background: "linear-gradient(135deg, var(--accent), #7c3aed)",
    border: "none", borderRadius: "var(--radius)",
    color: "#fff", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  },
  clearBtn: {
    width: "100%", padding: "9px 14px",
    background: "transparent",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  },
  tipsList: { display: "flex", flexDirection: "column", gap: 8 },
  tip: { display: "flex", gap: 8, alignItems: "flex-start" },
  tipDot: { color: "var(--accent)", fontWeight: 700, lineHeight: 1.5 },
  tipText: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 },
};
