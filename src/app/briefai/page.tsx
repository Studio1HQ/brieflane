"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "~/app/_store/chat";
import { MarkdownMessage } from "~/app/_components/MarkdownMessage";

function BriefAI() {
  const { messages, addMessage, updateMessage } = useChatStore();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsgId = Date.now().toString();
    const text = input.trim();
    setInput("");

    const currentMessages = useChatStore
      .getState()
      .messages.filter((m) => m.status !== "pending");

    const payloadMessages = [
      ...currentMessages,
      { id: userMsgId, role: "user", content: text },
    ];

    addMessage({ id: userMsgId, role: "user", content: text });

    const assistMsgId = (Date.now() + 1).toString();
    addMessage({
      id: assistMsgId,
      role: "assistant",
      content: "",
      status: "pending",
      optimisticState: "Thinking...",
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(
          `Server returned non-JSON response (status ${res.status}). First 100 chars: ${textResponse.slice(0, 100)}`,
        );
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.reply ||
            `Failed to fetch response (${res.status})`,
        );
      }

      updateMessage(assistMsgId, {
        content: data.reply,
        status: "success",
        optimisticState: undefined,
      });
    } catch (err: any) {
      updateMessage(assistMsgId, {
        content: "Error: " + err.message,
        status: "error",
        optimisticState: undefined,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  const handleComposerKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Start a conversation</p>
            <p style={styles.emptyText}>
              Ask about meetings, issues, summaries, decisions, risks, or Slack
              updates.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.row,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={
                msg.role === "user"
                  ? styles.userBubble
                  : msg.status === "error"
                    ? styles.errorBubble
                    : styles.assistantBubble
              }
            >
              {msg.status === "pending" ? (
                <div style={styles.pendingRow}>
                  <svg
                    style={styles.spinner}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      style={{ opacity: 0.25 }}
                    />
                    <path
                      fill="currentColor"
                      style={{ opacity: 0.75 }}
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{msg.optimisticState}</span>
                </div>
              ) : msg.role === "assistant" || msg.status === "error" ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                <div style={styles.userText}>{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      <form style={styles.composerWrap} onSubmit={handleSubmit}>
        <div style={styles.composerInner}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
            }}
            rows={1}
            placeholder="Ask anything..."
            style={styles.textarea}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              ...styles.sendButton,
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              width={18}
              height={18}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default BriefAI;

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: "relative",
    minHeight: "calc(100vh - var(--nav-height))",
    background: "var(--app-bg)",
  },
  messages: {
    width: "100%",
    maxWidth: "920px",
    margin: "0 auto",
    padding: "var(--space-2xl) var(--space-xl) 140px",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-xl)",
    boxSizing: "border-box",
  },
  row: {
    display: "flex",
    width: "100%",
  },
  assistantBubble: {
    width: "100%",
    maxWidth: "760px",
    color: "var(--app-text)",
    fontSize: "var(--text-body-md)",
    lineHeight: "var(--leading-body)",
  },
  userBubble: {
    maxWidth: "70%",
    background: "var(--app-panel)",
    border: "1px solid var(--app-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-md) var(--space-lg)",
    color: "var(--app-text)",
    boxShadow: "var(--shadow-soft)",
  },
  errorBubble: {
    width: "100%",
    maxWidth: "760px",
    background: "var(--app-panel)",
    border: "1px solid var(--app-border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-md) var(--space-lg)",
    color: "var(--app-text)",
  },
  userText: {
    whiteSpace: "pre-wrap",
    color: "var(--app-text)",
  },
  pendingRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    color: "var(--app-text-muted)",
    fontStyle: "italic",
    fontSize: "var(--text-body-sm)",
  },
  spinner: {
    width: "16px",
    height: "16px",
    animation: "spin 1s linear infinite",
  },
  emptyState: {
    minHeight: "50vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "var(--space-2xl)",
  },
  emptyTitle: {
    margin: 0,
    color: "var(--app-text)",
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-heading-md)",
    lineHeight: "var(--leading-heading-md)",
  },
  emptyText: {
    margin: "var(--space-sm) 0 0",
    color: "var(--app-text-muted)",
    fontSize: "var(--text-body-md)",
    maxWidth: "520px",
  },
  composerWrap: {
    position: "fixed",
    left: "50%",
    bottom: "0",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: "920px",
    padding: "var(--space-md) var(--space-xl) var(--space-xl)",
    boxSizing: "border-box",
    background:
      "linear-gradient(to top, var(--app-bg) 72%, rgba(249,247,243,0.88) 88%, rgba(249,247,243,0) 100%)",
  },
  composerInner: {
    display: "flex",
    alignItems: "flex-end",
    gap: "var(--space-sm)",
    background: "var(--app-panel)",
    border: "1px solid var(--app-border)",
    borderRadius: "28px",
    padding: "6px",
    boxShadow: "var(--shadow-soft)",
  },
  input: {
    flex: 1,
    height: "var(--control-height)",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--app-text)",
    padding: "0 var(--input-padding-x)",
    fontSize: "var(--text-body-md)",
    boxShadow: "none",
    minWidth: 0,
  },
  sendButton: {
    width: "var(--control-height)",
    height: "var(--control-height)",
    minWidth: "var(--control-height)",
    border: "none",
    borderRadius: "var(--radius-full)",
    background: "var(--app-accent)",
    color: "var(--color-on-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    minHeight: "var(--control-height)",
    maxHeight: "180px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--app-text)",
    padding: "10px var(--input-padding-x)",
    fontSize: "var(--text-body-md)",
    lineHeight: 1.45,
    boxShadow: "none",
    minWidth: 0,
    resize: "none",
    overflowY: "auto",
  },
};
