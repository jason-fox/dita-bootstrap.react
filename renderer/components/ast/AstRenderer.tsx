"use client";

import { ToggleProvider } from "../../context/ToggleContext";
import { useActiveTheme } from "../../hooks/useActiveTheme";
import type { AstNode } from "../../types/ast";
import { renderNode } from "./renderNode";
import type { RenderContext } from "./types";

export default function AstRenderer({
  nodes,
  ...rest
}: { nodes: AstNode[] } & Omit<RenderContext, "activeTheme">) {
  const activeTheme = useActiveTheme();
  const ctx: RenderContext = { ...rest, activeTheme };

  return (
    <ToggleProvider>
      {nodes.map((node, index) => renderNode(node, index, ctx))}
    </ToggleProvider>
  );
}
