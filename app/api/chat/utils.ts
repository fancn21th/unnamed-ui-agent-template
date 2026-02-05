import {
  convertToModelMessages,
  Tool,
  ToolSet,
  UIMessageStreamWriter,
  getStaticToolName,
  isStaticToolUIPart,
} from "ai";
import { HumanInTheLoopUIMessage } from "./types";

// 用于前端和后端共享的确认字符串
export const APPROVAL = {
  YES: "Yes, confirmed.",
  NO: "No, denied.",
} as const;

function isValidToolName<K extends PropertyKey, T extends object>(
  key: K,
  obj: T,
): key is K & keyof T {
  return key in obj;
}

/**
 * 处理需要人工输入的工具调用，在授权后执行工具
 *
 * @param options - 函数选项
 * @param options.tools - 工具名称到 Tool 实例的映射
 * @param options.writer - UIMessageStream writer 用于将结果发送回客户端
 * @param options.messages - 要处理的消息数组
 * @param executionFunctions - 工具名称到 execute 函数的映射
 * @returns Promise，解析为处理后的消息
 */
export async function processToolCalls<
  Tools extends ToolSet,
  ExecutableTools extends {
    [Tool in keyof Tools as Tools[Tool] extends { execute: Function }
      ? never
      : Tool]: Tools[Tool];
  },
>(
  {
    writer,
    messages,
  }: {
    tools: Tools; // 用于类型推断
    writer: UIMessageStreamWriter;
    messages: HumanInTheLoopUIMessage[];
  },
  executeFunctions: Partial<{
    [K in keyof ExecutableTools]: (
      input: ExecutableTools[K] extends Tool<infer Input, any> ? Input : never,
      options?: any,
    ) => Promise<any>;
  }>,
): Promise<HumanInTheLoopUIMessage[]> {
  const lastMessage = messages[messages.length - 1];
  const parts = lastMessage.parts ?? [];

  const processedParts = await Promise.all(
    parts.map(async (part) => {
      // 仅处理工具调用部分
      if (!isStaticToolUIPart(part)) return part;

      const toolName = getStaticToolName(part);

      // 仅在我们有工具的 execute 函数（意味着需要确认）并且处于 'output-available' 状态时继续
      if (!(toolName in executeFunctions) || part.state !== "output-available")
        return part;

      let result;

      if (part.output === APPROVAL.YES) {
        // 获取工具并检查工具是否有 execute 函数
        if (
          !isValidToolName(toolName, executeFunctions) ||
          part.state !== "output-available"
        ) {
          return part;
        }

        const toolInstance = executeFunctions[toolName] as Tool["execute"];
        if (toolInstance) {
          result = await toolInstance(part.input, {
            messages: await convertToModelMessages(messages),
            toolCallId: part.toolCallId,
          });
        } else {
          result = "Error: No execute function found on tool";
        }
      } else if (part.output === APPROVAL.NO) {
        result = "Error: User denied access to tool execution";
      } else {
        // 对于任何未处理的响应，返回原始 part
        return part;
      }

      // 将更新的工具结果转发到客户端
      writer.write({
        type: "tool-output-available",
        toolCallId: part.toolCallId,
        output: result,
      });

      // 返回带有实际结果的更新后的 toolInvocation
      return {
        ...part,
        output: result,
      };
    }),
  );

  // 最后返回处理后的消息
  return [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }];
}

export function getToolsRequiringConfirmation<T extends ToolSet>(
  tools: T,
): string[] {
  return (Object.keys(tools) as (keyof T)[]).filter((key) => {
    const maybeTool = tools[key];
    return typeof maybeTool.execute !== "function";
  }) as string[];
}
