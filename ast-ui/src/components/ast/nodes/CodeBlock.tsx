import React from "react";
import Prism, { type Token, type TokenStream } from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-bash";
import { isPropsObject } from "../../../lib/helpers";
import type { AstArray, AstNode } from "../../../types/ast";
import type { RenderChild } from "../types";

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
  return (isPropsObject(codeNode[1]) ? codeNode.slice(2) : codeNode.slice(1)) as AstNode[];
}

// Prism.highlight() needs one plain-text string; codeblocks with nested semantic markup
// (<cmdname>, <parmname>, ... - see keyword.xsl) use renderMixedCodeBlock instead.
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
    return React.createElement("pre", { key, ...preProps }, React.createElement("code", null, text));
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

interface TokenRange {
  start: number;
  end: number;
  classes: string[];
}

function textLength(node: AstNode): number {
  if (typeof node === "string") return node.length;
  return codeNodeChildren(node).reduce((sum, child) => sum + textLength(child), 0);
}

function collectRanges(stream: TokenStream, classes: string[], offset: { n: number }, out: TokenRange[]): void {
  if (typeof stream === "string") {
    if (classes.length) out.push({ start: offset.n, end: offset.n + stream.length, classes });
    offset.n += stream.length;
  } else if (Array.isArray(stream)) {
    for (const item of stream) collectRanges(item, classes, offset, out);
  } else {
    const token: Token = stream;
    collectRanges(token.content, [...classes, token.type, ...[token.alias ?? []].flat()], offset, out);
  }
}

function highlightText(text: string, start: number, ranges: TokenRange[], keyPrefix: string): React.ReactNode[] {
  const end = start + text.length;
  const out: React.ReactNode[] = [];
  let cursor = start;
  for (const range of ranges) {
    if (range.end <= start) continue;
    if (range.start >= end) break;
    const from = Math.max(range.start, cursor);
    const to = Math.min(range.end, end);
    if (from > cursor) out.push(text.slice(cursor - start, from - start));
    out.push(
      React.createElement(
        "span",
        { key: `${keyPrefix}-${from}`, className: `token ${range.classes.join(" ")}` },
        text.slice(from - start, to - start),
      ),
    );
    cursor = to;
  }
  if (cursor < end) out.push(text.slice(cursor - start));
  return out;
}

// Tokenizes the whole block's text so tokens keep their context, but only wraps the plain-text
// children: nested DITA markup (<cmdname>, <parmname>, ...) is rendered as-is, never overridden.
// Returns null when the language has no loaded grammar so the caller falls back to normal rendering.
export function renderMixedCodeBlock(
  preProps: Record<string, unknown>,
  codeNode: AstArray,
  key: React.Key,
  render: RenderChild,
): React.ReactNode | null {
  const language = extractLanguage(preProps.className);
  const grammar = Prism.languages[language];
  if (!grammar) return null;

  const children = codeNodeChildren(codeNode);
  const text = children
    .map(function flatten(child: AstNode): string {
      return typeof child === "string" ? child : codeNodeChildren(child).map(flatten).join("");
    })
    .join("");
  const ranges: TokenRange[] = [];
  collectRanges(Prism.tokenize(text, grammar), [], { n: 0 }, ranges);

  let offset = 0;
  const rendered = children.flatMap((child, index) => {
    const start = offset;
    offset += textLength(child);
    return typeof child === "string" ? highlightText(child, start, ranges, String(index)) : [render(child, index)];
  });
  const codeProps = isPropsObject(codeNode[1]) ? (codeNode[1] as Record<string, unknown>) : {};
  return React.createElement(
    "pre",
    { key, ...preProps },
    React.createElement("code", { ...codeProps, className: `language-${language}` }, ...rendered),
  );
}
