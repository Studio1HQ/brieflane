"use client";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "~/app/_store/chat";
import { MarkdownMessage } from "./MarkdownMessage";

export function ChatPanel() {
  const { isOpen, toggleChat, messages, addMessage, updateMessage } =
    useChatStore();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsgId = Date.now().toString();
    const text = input.trim();
    setInput("");

    // Get current messages filtering out any rogue pending messages
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
        body: JSON.stringify({
          messages: payloadMessages,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(
          `Server returned non-JSON response (status {res.status}). First 100 chars: ${textResponse.slice(0, 100)}`,
        );
      }

      if (!res.ok)
        throw new Error(
          data.error ||
            data.reply ||
            `Failed to fetch response (${res.status})`,
        );

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

  return (
    <>
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-(--app-accent) text-(--color-on-primary) shadow-(--shadow-soft) transition-colors hover:bg-(--app-accent-pressed)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] max-h-[calc(100vh-8rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-(--radius-md) border border-(--app-border) bg-(--app-panel) text-sm text-(--app-text) shadow-(--shadow-soft)">
          <div className="flex items-center justify-between border-b border-(--app-border) bg-(--app-panel) p-4">
            <div className="flex items-center gap-2 font-semibold text-(--app-text)">
              <span className="h-2 w-2 rounded-full bg-(--app-accent) animate-pulse"></span>
              Brief AI
            </div>
            <button
              onClick={toggleChat}
              className="text-(--app-text-muted) transition-colors hover:text-(--app-text)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 font-sans text-(--app-text-body)">
            {messages.length === 0 && (
              <div className="mt-10 text-center text-(--app-text-muted)">
                <div className="mb-4 text-4xl">🤖</div>
                <p>
                  Hello! I can help you manage Linear issues, lookup Slack
                  users, and review Fireflies meetings.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-(--radius-sm) px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-(--app-panel-muted) text-(--app-text)"
                      : "bg-(--app-panel) text-(--app-text)"
                  }`}
                >
                  {msg.status === "pending" ? (
                    <div className="flex items-center gap-2 italic text-(--app-text-muted)">
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {msg.optimisticState}
                    </div>
                  ) : msg.role === "assistant" ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}

            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-(--app-border) bg-(--app-panel) p-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Brief..."
              className="flex-1 rounded-(--radius-full) border border-(--app-border) bg-(--app-bg) px-3 py-2 text-(--app-text) transition-colors placeholder:text-(--app-text-soft) focus:border-(--app-accent) focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-(--radius-full) bg-(--app-accent) px-4 py-2 font-medium text-(--color-on-primary) transition-colors hover:bg-(--app-accent-pressed) disabled:opacity-50"
            >
              &rarr;
            </button>
          </form>
        </div>
      )}
    </>
  );
}
