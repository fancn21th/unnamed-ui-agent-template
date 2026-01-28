"use client";

import React from "react";
import { AntDesignOutlined, RedoOutlined } from "@ant-design/icons";
import { Actions, Bubble } from "@ant-design/x";
import { Avatar } from "antd";
import {
  StyledMessageBubbleContainer,
  StyledTime,
  StyledCustomBubbleContent,
} from "./style";

type Placement = "start" | "end";
type Role = "user" | "assistant";

function buildActionItems(args: { text: string; onRetry?: () => void }) {
  const items: Array<{
    key: string;
    label?: string;
    icon?: React.ReactNode;
    actionRender?: () => React.ReactNode;
    onClick?: () => void;
  }> = [
    {
      key: "copy",
      label: "copy",
      actionRender: () => <Actions.Copy text={args.text} />,
    },
  ];

  if (args.onRetry) {
    items.push({
      key: "retry",
      icon: <RedoOutlined />,
      label: "Retry",
      onClick: args.onRetry,
    });
  }

  return items;
}

interface MessageBubbleProps {
  role?: Role;
  placement?: Placement;
  /** 纯文本内容（用于 Bubble 渲染 + Copy action） */
  content?: string;
  /** 自定义内容（用于嵌套 Markdown 等） */
  children?: React.ReactNode;
  /** 时间文案（由外部格式化，比如北京时间） */
  time?: string;
  /** 是否显示操作区（仅在 assistant + 纯文本时生效） */
  showActions?: boolean;
  /** 点击 Retry 的回调（不传则不显示 Retry） */
  onRetry?: () => void;
  /** 透传给 Bubble 的 props（仅在使用 content 渲染时生效） */
  bubbleProps?: Partial<React.ComponentProps<typeof Bubble>>;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role = "assistant",
  placement,
  content,
  children,
  time,
  showActions = true,
  onRetry,
  bubbleProps,
}) => {
  const bubblePlacement: Placement = placement || (role === "user" ? "end" : "start");
  const isUserMessage = bubblePlacement === "end";
  const hasCustomContent = children != null;
  const text = content ?? "";
  const canShowActions =
    showActions && !isUserMessage && !hasCustomContent && text.trim().length > 0;

  return (
    <StyledMessageBubbleContainer $placement={bubblePlacement} $role={role}>
      <div className="avatar-wrapper">
        <Avatar icon={<AntDesignOutlined />} />
        <div className="time-wrapper">
          {time ? <StyledTime>{time}</StyledTime> : null}
        </div>
      </div>
      <div className="bubble-wrapper">
        {hasCustomContent ? (
          <StyledCustomBubbleContent $isUser={isUserMessage}>
            {children}
          </StyledCustomBubbleContent>
        ) : (
          <Bubble
            {...bubbleProps}
            content={text}
            typing={{ effect: "fade-in" }}
            footer={
              canShowActions
                ? () => (
                    <Actions
                      items={buildActionItems({ text, onRetry })}
                      onClick={(info) => {
                        // 仅对 retry 做响应，其它 action（copy）交给内置渲染
                        if (info?.key === "retry") onRetry?.();
                      }}
                    />
                  )
                : undefined
            }
            placement={bubblePlacement}
            styles={{
              content: {
                fontWeight: 400,
                fontStyle: "normal",
                fontSize: "14px",
                lineHeight: "22px",
                letterSpacing: "0px",
                color: "#252B37",
                borderRadius: isUserMessage ? "16px 16px 0px 16px" : "0",
                padding: isUserMessage ? "16px" : 0,
                background: isUserMessage ? "#E8EAFF" : "transparent",
              },
              root: isUserMessage
                ? { minHeight: "54px" }
                : { padding: 0, background: "transparent" },
            }}
          />
        )}
      </div>
    </StyledMessageBubbleContainer>
  );
};

export default MessageBubble;
