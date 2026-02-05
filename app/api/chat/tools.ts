import { tool, ToolSet } from "ai";
import { z } from "zod";

const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.string(),
  // 没有 execute 函数，需要人工确认
});

const getLocalTime = tool({
  description: "get the local time for a specified location",
  inputSchema: z.object({ location: z.string() }),
  outputSchema: z.string(),
  // 包含 execute 函数 -> 不需要确认
  execute: async ({ location }) => {
    const now = new Date();
    return `当前 ${location} 的时间是 ${now.toLocaleTimeString("zh-CN")}`;
  },
});

export const tools = {
  getWeatherInformation,
  getLocalTime,
} satisfies ToolSet;
