// requestUserTask.jsx
import React, { useState } from "react";
import io from "socket.io-client";

// 기존 동작 유지
const socket = io("http://localhost:4002");

function RequestUserTask({ data }) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSubmitting(true);

    try {
      // 기존 동작 유지
      localStorage.clear();
      socket.emit("message", { type: "confirm_response", response: trimmed });
      setInput("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brandDot} />
          <h2 style={styles.title}>VAL</h2>
        </div>

        {/* Guide/description area */}
        {data && (
          <div style={styles.description}>
            {typeof data === "string" ? data : JSON.stringify(data)}
          </div>
        )}

        {/* Input area */}
        <form
          style={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a task..."
            aria-label="Task input"
            style={styles.input}
          />
          <button
            type="submit"
            disabled={!input.trim() || submitting}
            style={{
              ...styles.button,
              ...(submitting || !input.trim() ? styles.buttonDisabled : null),
            }}
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </form>

        {/* Small help text */}
        <div style={styles.help}>
          Press <kbd style={styles.kbd}>Enter</kbd> to send
        </div>
      </div>
    </div>
  );
}

/** Inline styles: matched to app's base tone (light background, clean cards, subtle shadows) */
const styles = {
  page: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    boxSizing: "border-box",
  },
  card: {
    width: "min(560px, 90vw)",
    background: "#ffffff",
    border: "1px solid #E7EAF0",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    padding: 20,
    boxSizing: "border-box",
    textAlign: "left",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "rgb(132, 171, 249)", // Blue tone matching other screens
  },
  title: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1,
    color: "#1F2A44",
    fontWeight: 700,
  },
  description: {
    marginTop: 8,
    marginBottom: 16,
    padding: "12px 14px",
    background: "#F9FAFD",
    border: "1px solid #EDF1F7",
    borderRadius: 10,
    color: "#2A2F3A",
    lineHeight: 1.5,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    whiteSpace: "pre-wrap",
  },
  form: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    border: "1px solid #D7DBE7",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  button: {
    height: 40,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #D7DBE7",
    background: "#E6E7EB",
    color: "#111",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "filter 120ms ease",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  help: {
    marginTop: 10,
    color: "#7A8293",
    fontSize: 12,
  },
  kbd: {
    background: "#fff",
    border: "1px solid #D7DBE7",
    borderRadius: 6,
    padding: "2px 6px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
  },
};

export default RequestUserTask;
