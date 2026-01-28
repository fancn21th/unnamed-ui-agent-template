"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "@/components";
import Sender from "@/components/Sender";
import Markdown from "@/components/Markdown";

// 为同一个 messageKey 保持稳定的时间文案（仅客户端渲染）
const messageTimeCache = new Map<string, string>();

export default function ChatPageClient() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authed = !!localStorage.getItem("authenticated");

  useEffect(() => {
    if (!authed) router.replace("/login");
  }, [authed, router]);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const formatTime = (date?: Date) => {
    const now = date || new Date();
    // 北京时间（UTC+8）
    const beijingTime = new Date(
      now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 3600000,
    );
    const month = beijingTime.getMonth() + 1;
    const day = beijingTime.getDate();
    const hours = beijingTime.getHours();
    const minutes = beijingTime.getMinutes();
    return `${month}月${day}日 ${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const getOrCreateTimeText = (key: string) => {
    const cached = messageTimeCache.get(key);
    if (cached) return cached;
    const t = formatTime();
    messageTimeCache.set(key, t);
    return t;
  };

  const renderThinking = () => (
    <div style={{ padding: "16px", color: "#666" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>正在思考...</span>
      </div>
    </div>
  );

  const renderAssistantBody = (args: {
    messageText: string;
    isUpdating: boolean;
    messageId?: string;
    errorMessage?: string;
  }) => {
    if (args.errorMessage) {
      return (
        <Markdown
          content={`**消息发送失败**\n\n${args.errorMessage}`}
          status="error"
          messageId={args.messageId}
        />
      );
    }

    if (args.messageText || args.isUpdating) {
      return (
        <Markdown
          content={args.messageText || ""}
          status={args.isUpdating ? "updating" : "success"}
          messageId={args.messageId}
        />
      );
    }

    return renderThinking();
  };

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    router.push("/login");
  };

  const handleSend = (value: string) => {
    if (!value.trim()) return;
    sendMessage({ parts: [{ type: "text", text: value }] });
    setInputValue("");
  };

  if (!authed) return null;

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isStreaming = isLoading && lastMessage?.role === "assistant";
  const shouldShowLoadingAI =
    (isLoading || (error && lastMessage?.role === "user")) &&
    lastMessage?.role === "user";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">AI 助手</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100"
          >
            退出登录
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-gray-600 mb-2">
                开始对话
              </h2>
              <p className="text-sm text-gray-400">输入消息开始与 AI 助手对话</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const isLastMessage = index === messages.length - 1;
                const isUpdating = isLastMessage && isStreaming;
                const isError = isLastMessage && error && !isUser;

                const messageKey = message.id ?? `${message.role}-${index}`;
                const timeText = getOrCreateTimeText(messageKey);

                const messageText = message.parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("");

                if (isUser) {
                  return (
                    <MessageBubble
                      key={messageKey}
                      role="user"
                      placement="end"
                      content={messageText}
                      time={timeText}
                    />
                  );
                }

                return (
                  <MessageBubble
                    key={messageKey}
                    role="assistant"
                    placement="start"
                    time={timeText}
                  >
                    {renderAssistantBody({
                      messageText,
                      isUpdating,
                      messageId: message.id,
                      errorMessage: isError
                        ? error?.message || "请稍后重试"
                        : undefined,
                    })}
                  </MessageBubble>
                );
              })}

              {shouldShowLoadingAI && (
                <MessageBubble
                  key={error ? "error-ai-message" : "loading-ai-message"}
                  role="assistant"
                  placement="start"
                  time={getOrCreateTimeText(
                    error ? "error-ai-message" : "loading-ai-message",
                  )}
                >
                  {renderAssistantBody({
                    messageText: "",
                    isUpdating: false,
                    errorMessage: error ? error.message || "请稍后重试" : undefined,
                  })}
                </MessageBubble>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 py-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <Sender
            placeholder="输入消息..."
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            disabled={isLoading}
            loading={isLoading}
            dataSourceCount={0}
          />
        </div>
      </div>
    </div>
  );
}

