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

export interface DocSetSummary {
  id: string;
  title: string;
  description?: string;
}
