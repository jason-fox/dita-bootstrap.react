import type { TocDoc, TopicDoc } from "./docs";

export interface ToolResultContent {
  type: string;
  text?: string;
}

export interface ToolResult {
  content?: ToolResultContent[];
  isError?: boolean;
}

export interface ToolExecution {
  toolName: string;
  args: Record<string, unknown>;
  result: ToolResult;
}

// mirrors mcp-server's TopicPageProps, the JSON payload render_topic_ui returns as text content
export interface TopicViewerPayload {
  docId: string;
  topicPath: string;
  doc?: TopicDoc;
  toc?: TocDoc;
  theme: "light" | "dark";
}

export interface DocSetSummary {
  id: string;
  title: string;
  description?: string;
}
