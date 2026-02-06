/**
 * OpenAI 流式响应格式类型定义
 * 
 * 用于模拟 OpenAI Chat Completions API 的流式输出格式
 * 参考: https://platform.openai.com/docs/api-reference/chat/streaming
 */

import type { MessagePart } from "@/components/ComposedMarkdown/ComposedMarkdown";

// ==================== OpenAI 流式 Chunk 格式 ====================

/**
 * OpenAI 流式响应 Chunk
 * 每个 chunk 代表流式响应的一个增量更新
 */
export interface OpenAIStreamChunk {
  /** 响应的唯一标识符 */
  id: string;
  /** 对象类型，固定为 "chat.completion.chunk" */
  object: "chat.completion.chunk";
  /** 创建时间戳 */
  created: number;
  /** 使用的模型名称 */
  model: string;
  /** 系统指纹，用于调试 */
  system_fingerprint?: string;
  /** 选择列表，通常只有一个元素 */
  choices: Array<{
    /** 选择的索引 */
    index: number;
    /** 内容增量 */
    delta: {
      /** 角色信息（通常只在第一个 chunk 出现） */
      role?: "assistant" | "user" | "system";
      
      /** 内容增量（文本） */
      content?: string | null;
      
      /** 思考过程增量（如果有 reasoning_content 功能） */
      reasoning_content?: string | null;
      
      /** 工具调用列表 */
      tool_calls?: Array<{
        /** 调用的索引 */
        index: number;
        /** 工具调用 ID */
        id?: string;
        /** 工具类型，固定为 "function" */
        type?: "function";
        /** 函数调用详情 */
        function?: {
          /** 函数名称 */
          name?: string;
          /** 函数参数增量（JSON 字符串） */
          arguments?: string;
        };
      }>;
      
      /** 附件列表 */
      attachments?: Array<{
        /** 附件 ID */
        id: string;
        /** 附件类型 */
        type: string;
        /** 文件名 */
        filename?: string;
      }>;
    };
    /** 完成原因 */
    finish_reason?: "stop" | "tool_calls" | "length" | "content_filter" | "function_call" | null;
    /** 日志概率信息（可选） */
    logprobs?: boolean | null;
  }>;
}

/**
 * 工具调用函数的完整定义
 */
export interface ToolCallFunction {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * 工具调用项
 */
export interface ToolCallItem {
  id: string;
  type: "function";
  function: ToolCallFunction;
}

// ==================== 工具调用相关的 JSON Schema ====================

/**
 * 招聘表单的 JSON Schema（用于工具调用参数）
 */
export interface RecruitmentFormSchema {
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type: "input" | "select" | "switch" | "textarea" | "number";
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    description?: string;
    defaultValue?: unknown;
  }>;
}

/**
 * 任务列表项
 */
export interface TaskListItem {
  id: string;
  content: string;
  order: number;
}

/**
 * 任务列表的 JSON Schema（用于工具调用参数）
 */
export interface TaskListSchema {
  taskListId: string;
  title?: string;
  tasks: TaskListItem[];
}

// ==================== 模拟数据构建辅助函数 ====================

/**
 * 创建一个基础的 OpenAI Stream Chunk
 */
export function createBaseChunk(chunkId: string, model: string): Partial<OpenAIStreamChunk> {
  return {
    id: chunkId,
    object: "chat.completion.chunk",
    created: Date.now(),
    model: model,
  };
}

/**
 * 创建一个角色定义的 chunk（通常是第一个 chunk）
 */
export function createRoleChunk(chunkId: string, model: string, role: "assistant"): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: { role },
      finish_reason: null,
    }],
  };
}

/**
 * 创建一个内容增量的 chunk
 */
export function createContentChunk(
  chunkId: string,
  model: string,
  content: string,
  finishReason?: OpenAIStreamChunk["choices"][0]["finish_reason"]
): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: { content },
      finish_reason: finishReason ?? null,
    }],
  };
}

/**
 * 创建一个思考过程增量的 chunk
 */
export function createReasoningChunk(chunkId: string, model: string, reasoning: string): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: { reasoning_content: reasoning },
      finish_reason: null,
    }],
  };
}

/**
 * 创建一个工具调用开始的 chunk
 */
export function createToolCallStartChunk(
  chunkId: string,
  model: string,
  toolCallId: string,
  functionName: string,
  index: number = 0
): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index,
          id: toolCallId,
          type: "function",
          function: { name: functionName },
        }],
      },
      finish_reason: null,
    }],
  };
}

/**
 * 创建一个工具调用参数增量的 chunk
 */
export function createToolCallArgumentsChunk(
  chunkId: string,
  model: string,
  argumentsStr: string,
  index: number = 0
): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index,
          function: { arguments: argumentsStr },
        }],
      },
      finish_reason: null,
    }],
  };
}

/**
 * 创建一个流式结束的 chunk
 */
export function createFinishChunk(
  chunkId: string,
  model: string,
  finishReason: OpenAIStreamChunk["choices"][0]["finish_reason"] = "stop"
): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: finishReason,
    }],
  };
}

/**
 * 创建一个附件的 chunk
 */
export function createAttachmentChunk(
  chunkId: string,
  model: string,
  attachment: { id: string; type: string; filename?: string }
): OpenAIStreamChunk {
  const base = createBaseChunk(chunkId, model);
  return {
    id: base.id!,
    object: base.object!,
    created: base.created!,
    model: base.model!,
    choices: [{
      index: 0,
      delta: { attachments: [attachment] },
      finish_reason: null,
    }],
  };
}

// ==================== 工具函数：Chunk ID 生成 ====================

let chunkCounter = 0;

/**
 * 生成唯一的 chunk ID
 */
export function generateChunkId(prefix: string = "chatcmpl"): string {
  chunkCounter++;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${random}-${chunkCounter}`;
}

/**
 * 重置计数器（用于新的对话）
 */
export function resetChunkCounter(): void {
  chunkCounter = 0;
}

