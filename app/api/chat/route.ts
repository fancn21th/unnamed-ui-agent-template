import {
  convertToModelMessages,
  streamText,
  createUIMessageStreamResponse,
  createUIMessageStream,
  stepCountIs,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { processToolCalls } from "./utils";
import { tools } from "./tools";
import { HumanInTheLoopUIMessage } from "./types";

// 如果设置了代理环境变量，配置全局代理
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  }
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 允许流式响应最长 30 秒
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: HumanInTheLoopUIMessage[] } =
    await req.json();

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      // 工具函数处理需要人工确认的工具
      // 检查最后一条消息中的确认并运行相关工具
      const processedMessages = await processToolCalls(
        {
          messages,
          writer,
          tools,
        },
        {
          // 为没有 execute 函数的工具提供类型安全的对象
          getWeatherInformation: async ({ city }) => {
            const conditions = ["晴天", "多云", "雨天", "雪天"];
            return `${city} 的天气是${
              conditions[Math.floor(Math.random() * conditions.length)]
            }。`;
          },
        },
      );

      const result = streamText({
        model: openai("gpt-4o"),
        system: "You are a helpful assistant. 请用中文回答。",
        messages: await convertToModelMessages(processedMessages),
        tools,
        stopWhen: stepCountIs(5),
      });

      writer.merge(
        result.toUIMessageStream({ originalMessages: processedMessages }),
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
}
