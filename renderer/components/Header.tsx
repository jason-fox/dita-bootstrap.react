"use client";

import AstRenderer from "./AstRenderer";
import type { AstArray } from "../lib/api";

export default function Header({
  headerAst,
  title,
  docId,
  lang,
  onToggleSidebar,
  onClearChat,
  onSearch,
  noResultsText,
}: {
  headerAst?: AstArray;
  title: string;
  docId?: string;
  lang?: string;
  onToggleSidebar?: () => void;
  onClearChat?: () => void;
  onSearch?: (query: string) => void;
  noResultsText?: string;
}) {
  if (!headerAst) return null;

  return (
    <AstRenderer
      nodes={[headerAst]}
      title={title}
      docId={docId}
      lang={lang}
      onToggleSidebar={onToggleSidebar}
      onClearChat={onClearChat}
      onSearch={onSearch}
      noResultsText={noResultsText}
    />
  );
}
