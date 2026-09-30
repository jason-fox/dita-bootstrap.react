import type { CSSProperties } from "react";
import { isPropsObject, resolveStyle } from "../lib/helpers";
import type { AstArray } from "../types/ast";

export interface TocEntry {
  title?: string;
  href?: string;
  icon?: string;
  iconStyle?: CSSProperties;
  children: AstArray[];
}

// a toc entry is [type, props?, ...children]; props is present only when it's a plain object
export function parseTocEntry(entry: AstArray): TocEntry {
  const [, maybeProps, ...rest] = entry;
  const hasProps = isPropsObject(maybeProps);
  const { title, href, icon, iconStyle } = (hasProps ? maybeProps : {}) as {
    title?: string;
    href?: string;
    icon?: string;
    iconStyle?: string;
  };
  const children = (
    hasProps ? rest : [maybeProps, ...rest].filter((v) => v !== undefined)
  ) as AstArray[];
  return {
    title,
    href,
    icon,
    iconStyle: resolveStyle(iconStyle) as CSSProperties | undefined,
    children,
  };
}

export function tocEntryContains(
  entry: AstArray,
  predicate: (entry: TocEntry) => boolean,
): boolean {
  const parsed = parseTocEntry(entry);
  return predicate(parsed) || parsed.children.some((child) => tocEntryContains(child, predicate));
}

export function stripHash(value: string | undefined): string | undefined {
  return value ? value.split("#")[0] : undefined;
}
