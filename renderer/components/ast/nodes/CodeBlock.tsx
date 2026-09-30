import React from "react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-bash";
import { isPropsObject } from "@/lib/api";
import type { AstArray, AstNode } from "@/types/ast";

// Prism's DOMContentLoaded listener re-highlights the DOM after React renders, causing a
// hydration mismatch; Prism.manual can't be set in time, so no-op the listener instead.
if (typeof window !== "undefined") {
  Prism.highlightElement = () => {};
}

// DITA allows an ancestor-level default language that's resolved on the XSLT side, invisible
// here - fall back to "markup" (Prism degrades harmlessly on non-markup text either way).
function extractLanguage(className: unknown): string {
  if (typeof className === "string") {
    const match = className.match(/\blanguage-([\w-]+)\b/);
    if (match) return match[1];
  }
  return "markup";
}

// a ["code", props?, ...children] tuple's children, with props stripped off
function codeNodeChildren(codeNode: AstArray): AstNode[] {
  return (
    isPropsObject(codeNode[1]) ? codeNode.slice(2) : codeNode.slice(1)
  ) as AstNode[];
}

// Prism.highlight() needs one plain-text string; codeblocks with nested semantic markup
// (<cmdname>, <parmname>, ... - see keyword.xsl) fall through to normal recursion instead.
function isPlainTextCode(children: AstNode[]): children is string[] {
  return children.every((child) => typeof child === "string");
}

export function isHighlightableCodeBlock(codeNode: AstArray): boolean {
  return isPlainTextCode(codeNodeChildren(codeNode));
}

export function renderCodeBlock(
  preProps: Record<string, unknown>,
  codeNode: AstArray,
  key: React.Key,
): React.ReactNode {
  const text = codeNodeChildren(codeNode).join("");
  const language = extractLanguage(preProps.className);
  const grammar = Prism.languages[language];
  if (!grammar) {
    return React.createElement(
      "pre",
      { key, ...preProps },
      React.createElement("code", null, text),
    );
  }
  const html = Prism.highlight(text, grammar, language);
  return React.createElement(
    "pre",
    { key, ...preProps },
    React.createElement("code", {
      className: `language-${language}`,
      dangerouslySetInnerHTML: { __html: html },
    }),
  );
}
