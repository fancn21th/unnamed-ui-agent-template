"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [input, setInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("authenticated");
    if (!auth) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    router.push("/login");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    // 主容器 - 全屏高度，最大宽度居中，带内边距
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* 顶部导航栏 - 包含标题和退出登录按钮 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          退出登录
        </button>
      </div>

      {/* 消息显示区域 - 可滚动，占据剩余空间 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          // 单条消息容器 - 根据角色显示不同样式
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === "user"
                ? "bg-blue-100 ml-auto max-w-[80%]"
                : "bg-gray-100 mr-auto max-w-[80%]"
            }`}
          >
            {/* 消息发送者标识 */}
            <div className="font-semibold mb-1">
              {message.role === "user" ? "You" : "AI"}
            </div>
            {/* 消息内容 */}
            {message.parts.map((part) => {
              if (part.type === "text") {
                return (
                  <div
                    key={`${message.id}-text`}
                    className="whitespace-pre-wrap"
                  >
                    {part.text}
                  </div>
                );
              }
            })}
          </div>
        ))}
      </div>

      {/* 输入区域 - 包含输入框和发送按钮 */}
      <div className="flex gap-2">
        {/* 文本输入框 */}
        <input
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
          }}
          onKeyDown={async (event) => {
            if (event.key === "Enter") {
              sendMessage({
                parts: [{ type: "text", text: input }],
              });
              setInput("");
            }
          }}
        />
        {/* 发送按钮 */}
        <button
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={() => {
            if (input.trim()) {
              sendMessage({
                parts: [{ type: "text", text: input }],
              });
              setInput("");
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
