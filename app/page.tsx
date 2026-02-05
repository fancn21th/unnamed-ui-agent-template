"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getStaticToolName,
  isStaticToolUIPart,
} from "ai";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tools } from "./api/chat/tools";
import { APPROVAL, getToolsRequiringConfirmation } from "./api/chat/utils";
import { HumanInTheLoopUIMessage, MyTools } from "./api/chat/types";

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

  const { messages, sendMessage, addToolOutput } =
    useChat<HumanInTheLoopUIMessage>({
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

  const toolsRequiringConfirmation = getToolsRequiringConfirmation(tools);

  // 用于禁用输入，当确认待处理时
  const pendingToolCallConfirmation = messages.some((m) =>
    m.parts?.some(
      (part) =>
        isStaticToolUIPart(part) &&
        part.state === "input-available" &&
        toolsRequiringConfirmation.includes(getStaticToolName(part)),
    ),
  );

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* 顶部导航栏 - 包含标题和退出登录按钮 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI Chat (Human-in-the-Loop)</h1>
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
            {message.parts?.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div
                    key={`${message.id}-text-${i}`}
                    className="whitespace-pre-wrap"
                  >
                    {part.text}
                  </div>
                );
              }

              if (isStaticToolUIPart<MyTools>(part)) {
                const toolName = getStaticToolName(part);
                const toolCallId = part.toolCallId;

                // 渲染确认工具（带有用户交互的客户端工具）
                if (
                  toolsRequiringConfirmation.includes(toolName) &&
                  part.state === "input-available"
                ) {
                  return (
                    <div
                      key={toolCallId}
                      className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="mb-2">
                        <span className="font-semibold">
                          🤖 AI 请求执行工具：
                        </span>
                        <span className="font-mono bg-gray-100 px-2 py-1 ml-2 rounded text-sm">
                          {toolName}
                        </span>
                      </div>
                      <div className="mb-3 text-sm">
                        <span className="font-semibold">参数：</span>
                        <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(part.input, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                          onClick={async () => {
                            await addToolOutput({
                              toolCallId,
                              tool: toolName,
                              output: APPROVAL.YES,
                            });
                            sendMessage();
                          }}
                        >
                          ✓ 批准
                        </button>
                        <button
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                          onClick={async () => {
                            await addToolOutput({
                              toolCallId,
                              tool: toolName,
                              output: APPROVAL.NO,
                            });
                            sendMessage();
                          }}
                        >
                          ✗ 拒绝
                        </button>
                      </div>
                    </div>
                  );
                }
              }
            })}
          </div>
        ))}
      </div>

      {/* 输入区域 - 包含输入框和发送按钮 */}
      <div className="flex gap-2">
        {/* 文本输入框 */}
        <input
          disabled={pendingToolCallConfirmation}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={
            pendingToolCallConfirmation
              ? "请先确认工具调用..."
              : "输入消息... 试试询问天气或时间"
          }
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
          }}
          onKeyDown={async (event) => {
            if (event.key === "Enter" && !pendingToolCallConfirmation) {
              sendMessage({
                parts: [{ type: "text", text: input }],
              });
              setInput("");
            }
          }}
        />
        {/* 发送按钮 */}
        <button
          disabled={pendingToolCallConfirmation}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={() => {
            if (input.trim() && !pendingToolCallConfirmation) {
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
