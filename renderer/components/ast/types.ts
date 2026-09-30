import type { Key, ReactNode } from "react";
import type { AstNode } from "@/types/ast";

export interface RenderContext {
  docId?: string;
  lang?: string;
  title?: string;
  activeTheme?: string;
  noResultsText?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
  onToggleSidebar?: () => void;
  onClearChat?: () => void;
  onSendPrompt?: (text: string) => void;
  onSearch?: (query: string) => void;
}

export type RenderChild = (node: AstNode, key: Key) => ReactNode;

export interface InterceptedNodeProps {
  nodeKey: Key;
  resolvedProps: Record<string, unknown>;
  children: AstNode[];
  ctx: RenderContext;
  render: RenderChild;
}
