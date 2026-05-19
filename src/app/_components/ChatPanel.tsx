"use client";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "~/app/_store/chat";

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
        className="fixed bottom-6 right-6 h-12 w-12 bg-orange-500 hover:bg-orange-400 text-white rounded-full flex items-center justify-center shadow-lg z-50 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-zinc-900 border border-zinc-800 shadow-2xl rounded-sm flex flex-col z-50 overflow-hidden text-sm">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
            <div className="font-semibold text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Ops Agent
            </div>
            <button
              onClick={toggleChat}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-zinc-300">
            {messages.length === 0 && (
              <div className="text-center text-zinc-500 mt-10">
                <div className="text-4xl mb-4">🤖</div>
                <p>
                  Hello! I can help you manage Linear issues, lookup Slack
                  users, and review Fireflies meetings.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-sm max-w-[85%] ${msg.role === "user" ? "bg-zinc-800 text-zinc-100" : "bg-transparent border border-zinc-800 text-zinc-300"}`}
                >
                  {msg.status === "pending" ? (
                    <div className="flex items-center gap-2 text-zinc-500 italic">
                      <svg
                        className="animate-spin h-4 w-4"
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
            className="p-4 border-t border-zinc-800 bg-zinc-950 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Ops Agent..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-orange-500 text-white px-4 py-2 rounded-sm font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors"
            >
              &rarr;
            </button>
          </form>
        </div>
      )}
    </>
  );
}
