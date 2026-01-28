import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// 如果设置了代理环境变量，配置全局代理（可选）
// 只有在代理 URL 有效且可访问时才使用代理
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  // 检查代理 URL 是否有效（不是 localhost:7890 或为空）
  if (proxyUrl && !proxyUrl.includes("localhost:7890") && proxyUrl.trim() !== "") {
    try {
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    } catch (error) {
      console.warn("Failed to set proxy, continuing without proxy:", error);
    }
  }
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model: openai("gpt-4o"),
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}
