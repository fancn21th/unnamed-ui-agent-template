# 🎓 Human-in-the-Loop (HITL) 新手教程

## 📖 什么是 Human-in-the-Loop？

想象一下：AI 是你的助手，但有些重要决定需要你亲自批准。就像：

- 🤖 AI：我想帮你查询北京的天气
- 👤 你：好的，允许 / 不，拒绝
- 🤖 AI：收到！（执行或取消）

这就是 **Human-in-the-Loop** —— 在 AI 执行某些操作前，先征得人类的同意。

---

## 🏗️ 整体架构（5 个关键文件）

```
app/
├── api/chat/
│   ├── tools.ts      ← ① 定义 AI 可以使用的工具
│   ├── types.ts      ← ② 定义数据类型
│   ├── utils.ts      ← ③ 核心逻辑：处理确认流程
│   └── route.ts      ← ④ 后端 API：连接前后端
└── page.tsx          ← ⑤ 前端界面：显示确认按钮
```

---

## 📝 关键步骤详解

### 步骤 1️⃣：定义工具（tools.ts）

**这是什么？**
告诉 AI 它能做什么事情。就像给 AI 一本"技能手册"。

```typescript
// 需要确认的工具 ❗
const getWeatherInformation = tool({
  description: "查询城市天气",
  inputSchema: z.object({ city: z.string() }),  // 需要一个城市名
  outputSchema: z.string(),
  // 🔥 关键：没有 execute 函数 = 需要人工确认
});

// 自动执行的工具 ✅
const getLocalTime = tool({
  description: "获取当地时间",
  inputSchema: z.object({ location: z.string() }),
  outputSchema: z.string(),
  // 🔥 关键：有 execute 函数 = 自动执行，不需要确认
  execute: async ({ location }) => {
    return `当前 ${location} 的时间是 ${new Date().toLocaleTimeString()}`;
  },
});
```

**💡 规则：**

- **没有 `execute` 函数** = 需要人工确认 ❗
- **有 `execute` 函数** = 自动执行 ✅

---

### 步骤 2️⃣：定义确认状态（utils.ts）

**这是什么？**
定义用户的回答选项：同意 or 拒绝

```typescript
export const APPROVAL = {
  YES: "Yes, confirmed.",  // 用户点击"批准"
  NO: "No, denied.",       // 用户点击"拒绝"
} as const;
```

---

### 步骤 3️⃣：核心逻辑 - 处理确认（utils.ts）

**这是什么？**
这是整个 HITL 的"大脑"，负责：

1. 检查用户是否已确认
2. 如果确认 → 执行工具
3. 如果拒绝 → 返回错误
4. 把结果发回前端

```typescript
export async function processToolCalls(
  { writer, messages, tools },
  executeFunctions  // 这里存放真正的执行函数
) {
  // 1️⃣ 获取最后一条消息
  const lastMessage = messages[messages.length - 1];

  // 2️⃣ 遍历消息的每个部分
  const processedParts = await Promise.all(
    lastMessage.parts.map(async (part) => {
      // 只处理工具调用
      if (!isStaticToolUIPart(part)) return part;

      const toolName = getStaticToolName(part);

      // 3️⃣ 检查用户的确认状态
      if (part.output === APPROVAL.YES) {
        // ✅ 用户批准了 → 执行工具
        const toolInstance = executeFunctions[toolName];
        result = await toolInstance(part.input);
      }
      else if (part.output === APPROVAL.NO) {
        // ❌ 用户拒绝了 → 返回错误
        result = "Error: User denied access";
      }

      // 4️⃣ 把结果发回前端
      writer.write({
        type: "tool-output-available",
        toolCallId: part.toolCallId,
        output: result,
      });

      return { ...part, output: result };
    })
  );

  return processedMessages;
}
```

**💡 流程图：**

```
工具调用
   ↓
是否需要确认？
   ↓YES → 等待用户点击按钮
   ↓         ↓批准            ↓拒绝
   ↓    执行工具        返回错误
   ↓         ↓               ↓
   └─────────┴───────────────┘
            返回结果
```

---

### 步骤 4️⃣：后端 API（route.ts）

**这是什么？**
连接前端和 AI 的桥梁。

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      // 1️⃣ 先处理确认逻辑
      const processedMessages = await processToolCalls(
        { messages, writer, tools },
        {
          // 2️⃣ 定义 getWeatherInformation 的真正执行函数
          getWeatherInformation: async ({ city }) => {
            const conditions = ["晴天", "多云", "雨天", "雪天"];
            return `${city} 的天气是${conditions[随机]}。`;
          },
        }
      );

      // 3️⃣ 把处理好的消息发给 AI
      const result = streamText({
        model: openai("gpt-4o"),
        messages: await convertToModelMessages(processedMessages),
        tools,
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

**💡 关键点：**

- `processToolCalls` 会检查并执行用户确认的工具
- 执行函数写在第二个参数里（`getWeatherInformation: async ({ city }) => {...}`）

---

### 步骤 5️⃣：前端界面（page.tsx）

**这是什么？**
显示确认按钮，让用户点击。

```typescript
const { messages, sendMessage, addToolOutput } = useChat();

// 找出需要确认的工具
const toolsRequiringConfirmation = getToolsRequiringConfirmation(tools);

messages.map(message => {
  message.parts?.map(part => {
    // 如果是需要确认的工具调用
    if (
      isStaticToolUIPart(part) &&
      toolsRequiringConfirmation.includes(toolName) &&
      part.state === "input-available"  // 等待输入状态
    ) {
      return (
        <div>
          <p>AI 请求执行：{toolName}</p>
          <p>参数：{JSON.stringify(part.input)}</p>

          {/* 批准按钮 */}
          <button onClick={async () => {
            await addToolOutput({
              toolCallId: part.toolCallId,
              tool: toolName,
              output: APPROVAL.YES,  // 发送"批准"状态
            });
            sendMessage();  // 触发后端处理
          }}>
            ✓ 批准
          </button>

          {/* 拒绝按钮 */}
          <button onClick={async () => {
            await addToolOutput({
              toolCallId: part.toolCallId,
              tool: toolName,
              output: APPROVAL.NO,  // 发送"拒绝"状态
            });
            sendMessage();
          }}>
            ✗ 拒绝
          </button>
        </div>
      );
    }
  });
});
```

---

## 🔄 完整数据流程

让我们用一个例子看看完整流程：

### 场景：用户问"北京的天气怎么样？"

```
1. 用户输入消息 📝
   ↓
2. 发送到后端 API (route.ts)
   ↓
3. AI 决定调用 getWeatherInformation 工具 🤖
   ↓
4. 因为没有 execute 函数 → 发送"工具调用"到前端
   ↓
5. 前端检测到 state === "input-available"
   ↓
6. 显示确认卡片（黄色框）📋
   ├── [✓ 批准] ← 用户点击这里
   └── [✗ 拒绝]
   ↓
7. addToolOutput({ output: "Yes, confirmed." })
   ↓
8. sendMessage() → 发送回后端
   ↓
9. processToolCalls 检测到 output === "Yes, confirmed."
   ↓
10. 执行 getWeatherInformation({ city: "北京" })
    ↓
11. 返回结果："北京的天气是晴天。" ☀️
    ↓
12. AI 收到结果，生成最终回复
    ↓
13. 显示在聊天界面 💬
```

---

## 🎯 关键概念总结

### 1. **状态 (State)**

- `input-available`：等待用户确认
- `output-available`：用户已确认，等待执行

### 2. **两次 API 调用**

- **第一次**：AI 生成工具调用 → 前端显示按钮
- **第二次**：用户点击按钮 → 后端执行工具

### 3. **区分需要确认的工具**

```typescript
// ❗ 需要确认
const tool1 = tool({
  /* 没有 execute */
});

// ✅ 自动执行
const tool2 = tool({
  execute: async () => { ... }
});
```

### 4. **addToolOutput 的作用**

```typescript
addToolOutput({
  toolCallId: "abc123",     // 标识是哪个工具调用
  tool: "getWeatherInfo",   // 工具名称
  output: "Yes, confirmed." // 临时结果（确认状态）
});
```

---

## 🧪 测试例子

### 例子 1：需要确认（getWeatherInformation）

```
你：上海的天气怎么样？
AI：[生成工具调用]
界面：🟨 AI 请求执行工具：getWeatherInformation
      参数：{ city: "上海" }
      [✓ 批准] [✗ 拒绝]
你：[点击批准]
AI：上海的天气是多云。
```

### 例子 2：自动执行（getLocalTime）

```
你：北京现在几点？
AI：当前北京的时间是 14:30:25
（没有确认按钮，直接返回结果）
```

---

## 💡 为什么这样设计？

### 安全性 🔒

防止 AI 执行危险操作，例如：

- 删除文件
- 发送邮件
- 支付款项

### 透明性 👀

让用户知道 AI 在干什么：

- 显示工具名称
- 显示参数
- 用户明确同意

### 灵活性 🎨

可以混合使用：

- 有些工具需要确认（敏感操作）
- 有些工具自动执行（安全操作）

---

## 🚀 如何添加新的需要确认的工具？

### 步骤

1. **在 tools.ts 添加工具定义**（不要写 execute）

```typescript
const sendEmail = tool({
  description: "发送邮件",
  inputSchema: z.object({
    to: z.string(),
    subject: z.string()
  }),
  outputSchema: z.string(),
  // 不写 execute！
});
```

1. **在 route.ts 添加执行函数**

```typescript
const processedMessages = await processToolCalls(
  { messages, writer, tools },
  {
    getWeatherInformation: async ({ city }) => { ... },
    sendEmail: async ({ to, subject }) => {  // ← 新增
      // 发送邮件的逻辑
      return `邮件已发送到 ${to}`;
    },
  }
);
```

1. **前端自动显示确认按钮**（不需要改代码！）
前端会自动检测到这是需要确认的工具，并显示按钮。

---

## ❓ 常见问题

### Q1: 为什么要两次 API 调用？

**A:**

- 第一次：AI 决定调用工具 → 前端显示按钮
- 第二次：用户确认 → 后端执行工具

### Q2: APPROVAL.YES 是什么？

**A:** 只是一个字符串标记，表示"用户批准了"。后端靠这个判断是否执行工具。

### Q3: 能不能不用确认？

**A:** 可以！在工具定义里加上 `execute` 函数即可。

### Q4: processToolCalls 什么时候调用？

**A:** 每次后端收到消息时，都会先调用它检查是否有需要处理的确认。

---

## 🎉 总结

**Human-in-the-Loop 就三步：**

1. **定义工具**（有 execute = 自动，无 execute = 需确认）
2. **前端显示按钮**（用户点击批准/拒绝）
3. **后端处理确认**（检查状态 → 执行工具）

核心思想：**在 AI 执行敏感操作前，先问问人类！**

---

📚 **相关文档：**

- [AI SDK 官方文档](https://ai-sdk.dev)
- [Human-in-the-Loop 完整示例](https://ai-sdk.dev/cookbook/next/human-in-the-loop)
