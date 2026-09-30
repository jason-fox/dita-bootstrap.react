import type { TocDoc, TopicDoc } from "./docs";

// mirrors the JSON payload the MCP server's render_topic_ui tool returns as text content
export interface TopicViewerPayload {
  docId: string;
  topicPath: string;
  doc?: TopicDoc;
  toc?: TocDoc;
  theme?: "light" | "dark";
}
