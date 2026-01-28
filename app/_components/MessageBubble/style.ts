import styled from "styled-components";

// 样式常量
const MESSAGE_GAP = "24px";
const AVATAR_GAP = "8px";
const USER_BUBBLE_BG = "#E8EAFF";
const TEXT_COLOR = "#252B37";

export const StyledMessageBubbleContainer = styled.div<{
  $placement: "start" | "end";
  $role?: "user" | "assistant";
}>`
  display: flex;
  flex-direction: column;
  align-items: ${(props) =>
    props.$placement === "end" ? "flex-end" : "flex-start"};
  width: 100%;
  gap: ${MESSAGE_GAP};

  .avatar-wrapper {
    display: flex;
    align-items: center;
    gap: ${AVATAR_GAP};
    width: 100%;
    flex-direction: ${(props) =>
      props.$placement === "end" ? "row-reverse" : "row"};
  }

  .bubble-wrapper {
    display: flex;
    align-items: flex-start;
    max-width: calc(100% - 48px);
  }

  .time-wrapper {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
`;

export const StyledTime = styled.div`
  font-weight: 400;
  font-style: normal;
  font-size: 12px;
  line-height: 20px;
  letter-spacing: 0;
  color: #403f4d;
`;

export const StyledCustomBubbleContent = styled.div<{ $isUser: boolean }>`
  font-weight: 400;
  font-style: normal;
  font-size: 14px;
  line-height: 22px;
  letter-spacing: 0;
  color: ${TEXT_COLOR};

  border-radius: ${(p) => (p.$isUser ? "16px 16px 0px 16px" : "0")};
  padding: ${(p) => (p.$isUser ? "16px" : "0")};
  background: ${(p) => (p.$isUser ? USER_BUBBLE_BG : "transparent")};
  min-height: ${(p) => (p.$isUser ? "54px" : "auto")};
`;
