"use client";

import { useEffect, useState } from "react";
import { ToggleProvider } from "../../context/ToggleContext";
import { useActiveTheme } from "../../hooks/useActiveTheme";
import { loadPrismLanguages } from "../../lib/prism";
import type { AstNode } from "../../types/ast";
import { renderNode } from "./renderNode";
import type { RenderContext } from "./types";

export default function AstRenderer({
  nodes,
  codeLanguages,
  ...rest
}: { nodes: AstNode[]; codeLanguages?: string[] } & Omit<RenderContext, "activeTheme">) {
  const activeTheme = useActiveTheme();
  const [, setLanguagesLoaded] = useState(0);
  const languageKey = codeLanguages?.join(",");

  useEffect(() => {
    if (!languageKey) return;
    let cancelled = false;
    loadPrismLanguages(languageKey.split(",")).then(() => {
      if (!cancelled) setLanguagesLoaded((count) => count + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [languageKey]);

  const ctx: RenderContext = { ...rest, activeTheme };

  return <ToggleProvider>{nodes.map((node, index) => renderNode(node, index, ctx))}</ToggleProvider>;
}
