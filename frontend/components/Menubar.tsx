"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import Container from "react-bootstrap/Container";
import {
  isPropsObject,
  resolveHref,
  resolveStyle,
  type AstArray,
} from "../lib/api";

function splitEntry(entry: AstArray, docId?: string) {
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
    href: href ? (resolveHref(href, docId) as string) : undefined,
    icon,
    iconStyle: resolveStyle(iconStyle) as CSSProperties | undefined,
    children,
  };
}

function findFirstHref(entry: AstArray, docId?: string): string | undefined {
  const { href, children } = splitEntry(entry, docId);
  if (href) return href;
  for (const child of children) {
    const childHref = findFirstHref(child, docId);
    if (childHref) return childHref;
  }
  return undefined;
}

function containsPath(entry: AstArray, pathname: string, docId?: string): boolean {
  const { href, children } = splitEntry(entry, docId);
  const cleanHref = href ? href.split("#")[0] : undefined;
  const cleanPathname = pathname ? pathname.split("#")[0] : undefined;
  const isMatch = Boolean(cleanHref && cleanHref === cleanPathname);
  return isMatch || children.some((child) => containsPath(child, pathname, docId));
}

export default function Menubar({
  entries,
  docId,
}: {
  entries: AstArray[];
  docId?: string;
}) {
  const pathname = usePathname();

  if (!entries || entries.length === 0) return null;

  return (
    <div className="bg-body-tertiary border-bottom">
      <Container fluid="xxl" className="px-4">
        <nav aria-label="Menubar navigation">
          <ul className="nav nav-pills rounded-0" role="menubar">
            {entries.map((entry, index) => {
              const { title, href, icon, iconStyle } = splitEntry(entry, docId);
              const effectiveHref = href || findFirstHref(entry, docId);
              const cleanHref = effectiveHref ? effectiveHref.split("#")[0] : undefined;
              const cleanPathname = pathname ? pathname.split("#")[0] : undefined;
              const isDirectMatch = Boolean(cleanHref && cleanHref === cleanPathname);
              const isActive = isDirectMatch || containsPath(entry, pathname, docId);

              return (
                <li key={index} className="nav-item" role="none">
                  {effectiveHref ? (
                    <Link
                      href={effectiveHref}
                      className={`nav-link rounded-0 ${isActive ? "bg-secondary-subtle text-secondary active" : "text-secondary"}`}
                      role="menuitem"
                    >
                      {icon && <i className={`${icon} me-1`} style={iconStyle} />}
                      {title}
                    </Link>
                  ) : (
                    <span className="nav-link rounded-0 text-secondary disabled" role="menuitem">
                      {icon && <i className={`${icon} me-1`} style={iconStyle} />}
                      {title}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>
    </div>
  );
}
