import type { DocSetSummary, ToolExecution, TopicViewerPayload } from "@/types/mcp";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolResults?: ToolExecution[];
  provider?: string;
  model?: string;
}

export interface HealthStatus {
  status: string;
  provider?: string;
  model?: string;
  llmConfigured?: boolean;
  llmError?: string;
  mcpConnected?: boolean;
  toolsCount?: number;
  showToolInvocations?: boolean;
  docSets?: DocSetSummary[];
}

export interface ActiveModalTopic {
  title: string;
  payload: TopicViewerPayload;
}
