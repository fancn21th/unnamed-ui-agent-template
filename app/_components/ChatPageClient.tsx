"use client";

import { useState, useCallback, useMemo } from "react";
import { Sender } from "@/components/Sender/Sender";
import { MessageList } from "@/components/MessageList/MessageList";
import type { MessageItem } from "@/components/MessageList/MessageList";
import { TripleSplitPane } from "@/components/wuhan/composed/triple-split-pane";

// 导入新的 AISDK Hook
import { useAisdkStream } from "@/hooks/useAisdkStream";
import {
  getStreamChunks,
  type StreamScenario,
} from "@/data/openai-stream-chunks";

// ==================== 场景选项 ====================

const SCENARIO_OPTIONS: { value: StreamScenario; label: string }[] = [
  { value: "full-demo", label: "完整演示（5条消息）" },
  { value: "recruitment-form", label: "1. 招聘表单" },
  { value: "analysis", label: "2. 分析中" },
  { value: "analysis-complete", label: "3. 分析完成+任务列表" },
  { value: "search-candidates", label: "4. 搜索候选人" },
  { value: "confirm-form", label: "5. 确认表单" },
];

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedScenario, setSelectedScenario] =
    useState<StreamScenario>("full-demo");

  // 使用新的 AISDK Hook
  const {
    parts: streamingParts,
    isStreaming,
    pendingInteraction,
    startStream,
    reset: resetAisdk,
    confirmForm,
    updateTaskList,
  } = useAisdkStream();

  // 将流式 parts 转换为 MessageItem
  const streamingMessages: MessageItem[] = useMemo(() => {
    if (streamingParts.length === 0) {
      console.log("[Page] streamingParts is empty, returning []");
      return [];
    }

    console.log("[Page] streamingParts changed:", {
      count: streamingParts.length,
      parts: streamingParts.map((p) => p.id + "|" + p.type),
    });

    return [
      {
        id: "aisdk-streaming-msg",
        role: "assistant",
        parts: streamingParts,
      },
    ];
  }, [streamingParts]);

  // 合并所有消息
  const allMessages: MessageItem[] = useMemo(() => {
    const result = [...messages, ...streamingMessages];
    console.log("[Page] allMessages updated:", {
      totalCount: result.length,
      regularMessages: messages.length,
      streamingMessages: streamingMessages.length,
      hasStreaming: streamingMessages.length > 0,
    });
    return result;
  }, [messages, streamingMessages]);

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // 添加用户消息
    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // 模拟 AI 回复
    setTimeout(() => {
      const aiMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `收到你的消息："${content.trim()}"。这是 AI 的回复示例。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  }, []);

  const handleStartStream = useCallback(() => {
    console.log("[Page] Starting stream with scenario:", selectedScenario);
    const chunks = getStreamChunks(selectedScenario);
    console.log("[Page] Chunks count:", chunks.length);
    startStream(chunks);
  }, [selectedScenario, startStream]);

  const handleReset = useCallback(() => {
    resetAisdk();
    setMessages([]);
  }, [resetAisdk]);

  const handleScenarioChange = useCallback((scenario: StreamScenario) => {
    setSelectedScenario(scenario);
  }, []);

  // 处理表单确认
  const handleConfirmForm = useCallback(
    (formData: Record<string, unknown>) => {
      console.log("[Page] handleConfirmForm:", formData);
      confirmForm(formData);
    },
    [confirmForm],
  );

  // 处理任务列表更新
  const handleUpdateTaskList = useCallback(
    (
      taskListId: string,
      tasks: Array<{ id: string; content: string; completed?: boolean }>,
    ) => {
      console.log("[Page] handleUpdateTaskList:", { taskListId, tasks });
      updateTaskList(tasks);
    },
    [updateTaskList],
  );

  // 转换 pendingInteraction 类型
  const pendingInteractionForList = useMemo(() => {
    if (!pendingInteraction || !pendingInteraction.id) {
      return null;
    }
    if (pendingInteraction.type !== "form") {
      return null;
    }
    return {
      type: "form" as const,
      id: pendingInteraction.id,
    };
  }, [pendingInteraction]);

  /** 渲染聊天部分 */
  const renderChat = () => (
    <div className="flex-1 overflow-hidden flex flex-col overflow-hidden">
      <div className="flex-1 w-[800px] mx-auto flex flex-col overflow-hidden">
        <MessageList
          messages={allMessages}
          pendingInteraction={pendingInteractionForList}
          onConfirmForm={handleConfirmForm}
          onUpdateTaskList={handleUpdateTaskList}
        />
        <div className="pb-6 shrink-0">
          <Sender onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );

  /** 渲染控制栏 */
  const renderControlBar = () => (
    <div className="border-b border-[#E1E0E7] h-[52px] shrink-0 px-4 flex items-center gap-4 bg-[#F9F9FB]">
      <span className="text-sm text-[#787A80]">流式演示：</span>

      {/* 场景选择 */}
      <select
        value={selectedScenario}
        onChange={(e) => handleScenarioChange(e.target.value as StreamScenario)}
        className="px-3 py-1.5 bg-white border border-[#E1E0E7] text-[#403F4D] text-sm rounded hover:bg-gray-50 transition-colors"
      >
        {SCENARIO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleStartStream}
        disabled={isStreaming}
        className="px-3 py-1.5 bg-[#4B6FED] text-white text-sm rounded hover:bg-[#3D5BD9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isStreaming ? "流式输出中..." : "开始流式演示"}
      </button>

      <button
        onClick={handleReset}
        className="px-3 py-1.5 bg-white border border-[#E1E0E7] text-[#403F4D] text-sm rounded hover:bg-gray-50 transition-colors"
      >
        重置
      </button>

      {/* 状态指示器 */}
      <span
        className={`text-xs px-2 py-1 rounded ${
          isStreaming
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {isStreaming ? "流式中" : "空闲"}
      </span>

      {/* 待交互提示 */}
      {pendingInteraction && (
        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
          等待交互:{" "}
          {pendingInteraction.type === "form" ? "请填写表单" : "请确认任务列表"}
        </span>
      )}
    </div>
  );

  return (
    <TripleSplitPane
      className="w-full bg-[var(--bg-neutral-light)] gap-3 p-3"
      left={{
        title: "左侧面板",
        defaultSize: 20,
        minSize: 240,
        collapsedSize: 0,
        children: (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              这是左侧面板的内容区域
            </p>
            <div className="p-4 bg-[var(--bg-item-hover)] rounded-md">
              <p className="text-xs">示例内容 1</p>
            </div>
            <div className="p-4 bg-[var(--bg-item-hover)] rounded-md">
              <p className="text-xs">示例内容 2</p>
            </div>
          </div>
        ),
      }}
      center={{
        title: "中间面板",
        defaultSize: 50,
        minSize: 360,
        children: (
          <div className="w-full h-full flex flex-col">
            {renderControlBar()}
            {renderChat()}
          </div>
        ),
      }}
      right={{
        title: "右侧面板",
        defaultSize: 30,
        minSize: 360,
        collapsedSize: 48,
        children: (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              这是右侧面板的内容区域
            </p>
            <div className="p-4 bg-[var(--bg-item-hover)] rounded-md">
              <p className="text-xs">示例内容 X</p>
            </div>
            <div className="p-4 bg-[var(--bg-item-hover)] rounded-md">
              <p className="text-xs">示例内容 Y</p>
            </div>
          </div>
        ),
      }}
    />
  );
}
