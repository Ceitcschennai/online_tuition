

import React, { useState, useRef, useEffect } from "react";

const S = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#fff",
    overflow: "hidden",
    fontFamily: "inherit",
    maxWidth: "100%",
    height: "480px",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fafafa",
  },
  headerIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "15px",
  },
  headerTitle: { fontSize: "14px", fontWeight: "600", color: "#111827" },
  headerSub: { fontSize: "11px", color: "#9ca3af", marginTop: "1px" },
  chat: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "#fff",
  },
  msgRow: (isUser) => ({
    display: "flex",
    flexDirection: isUser ? "row-reverse" : "row",
    alignItems: "flex-end",
    gap: "8px",
  }),
  avatar: (isUser) => ({
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: isUser ? "#e5e7eb" : "#ede9fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "600",
    color: isUser ? "#6b7280" : "#7c3aed",
    flexShrink: 0,
  }),
  bubble: (type) => ({
    maxWidth: "78%",
    padding: "9px 13px",
    borderRadius: type === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
    fontSize: "13px",
    lineHeight: "1.55",
    background:
      type === "user" ? "#f3f4f6"
      : type === "blocked" ? "#fef2f2"
      : "#faf5ff",
    color:
      type === "user" ? "#111827"
      : type === "blocked" ? "#dc2626"
      : "#1f1035",
    border:
      type === "blocked" ? "1px solid #fecaca" : "none",
  }),
  trace: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginTop: "5px",
    paddingLeft: "36px",
  },
  traceStep: (done) => ({
    fontSize: "10px",
    padding: "2px 7px",
    borderRadius: "20px",
    border: `1px solid ${done ? "#d1fae5" : "#fee2e2"}`,
    color: done ? "#059669" : "#dc2626",
    background: done ? "#ecfdf5" : "#fef2f2",
  }),
  inputArea: {
    padding: "12px 16px",
    borderTop: "1px solid #f3f4f6",
    background: "#fff",
  },
  suggestions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  sugg: {
    fontSize: "11px",
    padding: "4px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    cursor: "pointer",
    color: "#6b7280",
    background: "#fff",
    transition: "all 0.15s",
  },
  row: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: "9px 13px",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    color: "#111827",
    background: "#fff",
  },
  btn: (disabled) => ({
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    background: disabled ? "#e5e7eb" : "#6366f1",
    color: disabled ? "#9ca3af" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s",
  }),
};

// ── Dot loader ────────────────────────────────────────────────────────────────
function DotLoader() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#9ca3af",
            animation: "pbDot 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`@keyframes pbDot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PromptBox({ role = "student", suggestions = [] }) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      type: "ai",
      text: role === "student"
        ? "Hi! I'm your secure AI assistant. Ask me anything about your own academic data — EMIS number, class, subjects, contact details, and more."
        : "Hi! I'm your secure AI assistant. Ask me about your assigned classes, subjects, qualifications, or contact details.",
      trace: [],
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const getInitials = (role) =>
    role === "student" ? "ST" : role === "teacher" ? "TC" : "AD";

  const sendMessage = async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), type: "user", text, trace: [] };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    // Add thinking bubble
    const thinkId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: thinkId, type: "thinking", text: "", trace: [] }]);

    try {
      // Get JWT token — adjust the key if you store it differently
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token");

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json();

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkId)
          .concat({
            id: Date.now() + 2,
            type: data.blocked ? "blocked" : "ai",
            text: data.message,
            trace: data.trace || [],
            fields: data.fieldsAccessed || [],
          })
      );
    } catch (err) {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkId)
          .concat({
            id: Date.now() + 2,
            type: "blocked",
            text: "Unable to reach the AI assistant. Please check your connection and try again.",
            trace: [],
          })
      );
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={S.wrapper}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerIcon}>✦</div>
        <div>
          <div style={S.headerTitle}>AI Assistant</div>
          <div style={S.headerSub}>4-agent secure pipeline • your data only</div>
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={S.chat}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <div style={S.msgRow(msg.type === "user")}>
              {msg.type !== "user" && (
                <div style={S.avatar(false)}>AI</div>
              )}
              <div style={S.bubble(msg.type)}>
                {msg.type === "thinking" ? <DotLoader /> : msg.text}
              </div>
              {msg.type === "user" && (
                <div style={S.avatar(true)}>{getInitials(role)}</div>
              )}
            </div>
            {msg.trace && msg.trace.length > 0 && (
              <div style={S.trace}>
                {msg.trace.map((step, i) => (
                  <span key={i} style={S.traceStep(msg.type !== "blocked" || i === 0)}>
                    {step}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        {suggestions.length > 0 && (
          <div style={S.suggestions}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                style={S.sugg}
                onClick={() => { setPrompt(s); inputRef.current?.focus(); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div style={S.row}>
          <input
            ref={inputRef}
            style={S.input}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your data..."
            disabled={loading}
          />
          <button
            style={S.btn(loading || !prompt.trim())}
            onClick={sendMessage}
            disabled={loading || !prompt.trim()}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
