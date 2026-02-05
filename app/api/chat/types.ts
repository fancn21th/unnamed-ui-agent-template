import { InferUITools, UIDataTypes, UIMessage } from "ai";
import { tools } from "./tools";

export type MyTools = InferUITools<typeof tools>;

// 定义自定义消息类型
export type HumanInTheLoopUIMessage = UIMessage<
  never, // metadata type
  UIDataTypes, // data parts type
  MyTools // tools type
>;
