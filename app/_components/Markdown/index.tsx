"use client";

import type { MarkdownProps } from "./declaration";
import { markdownConfig } from "./config";
// import CustomSource from '@/components/Chat/CustomSource';
import CustomSources from "./CustomSources";
import { lazy, Suspense, useDeferredValue, useMemo } from "react";
import {
  ImageSkeleton,
  IncompleteLink,
  TableSkeleton,
  HtmlSkeleton,
  IncompleteEmphasis,
} from "./components";
import { StyledMarkdownWrapper } from "./style";
import "@ant-design/x-markdown/themes/light.css";
import { useCallback } from "react";
import Code from "./Code";
import Table from "./Table";

const GptVis = lazy(() =>
  import("./components/GptVis").then((mod) => ({ default: mod.GptVis })),
);
const DynamicForm = lazy(() =>
  import("./components/DynamicForm").then((mod) => ({
    default: mod.DynamicForm,
  })),
);
const DynamicTable = lazy(() =>
  import("./components/DynamicTable").then((mod) => ({
    default: mod.DynamicTable,
  })),
);
const ThinkComponent = lazy(() =>
  import("./components/ThinkComponent").then((mod) => ({
    default: mod.ThinkComponent,
  })),
);
// import '@ant-design/x-markdown/themes/dark.css';

const Markdown: React.FC<MarkdownProps> = ({
  content,
  status,
  messageId,
  ...props
}) => {
  /**
   * content 使用 useDeferredValue 进行性能优化
   * 尤其是开启了enableAnimation时 content更新频率极高时会导致React堆栈溢出
   * 避免在内容频繁更新时导致的卡顿
   * **/
  const deferredValue = useDeferredValue(content);
  const CustomSourcesCb = useCallback(
    // @ts-ignore
    (props) => <CustomSources messageId={messageId} {...props} />,
    [messageId],
  );

  // 保持 components / streaming 引用稳定，避免 x-markdown 内部重复初始化导致嵌套更新
  const components = useMemo(
    () => ({
      code: Code,
      "dynamic-form": DynamicForm,
      "dynamic-table": DynamicTable,
      think: ThinkComponent,
      "gpt-vis": GptVis,
      // 'custom-source': CustomSourceCb,
      // 'custom-sources': CustomSourcesCb,
      sup: CustomSourcesCb,
      table: Table,

      "incomplete-image": ImageSkeleton,
      "incomplete-link": IncompleteLink,
      "incomplete-table": TableSkeleton,
      "incomplete-html": HtmlSkeleton,
      "incomplete-emphasis": IncompleteEmphasis,
    }),
    [CustomSourcesCb],
  );

  const streaming = useMemo(
    () => ({
      hasNextChunk: status === "updating",
      // 注意：x-markdown 的 enableAnimation 在高频流式更新下可能触发 React 的嵌套更新限制
      // （Maximum update depth exceeded）。这里关闭动画以保证稳定性。
      enableAnimation: false,
    }),
    [status],
  );

  return (
    <Suspense fallback={<div></div>}>
      <StyledMarkdownWrapper
        content={deferredValue as string}
        // paragraphTag="div"
        config={markdownConfig}
        components={components}
        streaming={streaming}
        {...props}
      />
    </Suspense>
  );
};

export default Markdown;

// ```dynamic-form
// schema: {...}
// ```

// <dynamic-form schema="..."></dynamic-form>
// <html-renderer content="..."></html-renderer>
