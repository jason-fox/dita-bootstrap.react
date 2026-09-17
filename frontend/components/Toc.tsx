"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { isPropsObject, resolveHref, resolveStyle, type AstArray } from "@/lib/api";

function splitEntry(entry: AstArray) {
  const [, maybeProps, ...rest] = entry;
  const hasProps = isPropsObject(maybeProps);
  const { title, href, icon, iconStyle } = (hasProps ? maybeProps : {}) as {
    title?: string;
    href?: string;
    icon?: string;
    iconStyle?: string;
  };
  const children = (hasProps ? rest : [maybeProps, ...rest].filter((v) => v !== undefined)) as AstArray[];
  return {
    title,
    href: href ? (resolveHref(href) as string) : undefined,
    icon,
    iconStyle: resolveStyle(iconStyle) as CSSProperties | undefined,
    children,
  };
}

function containsPath(entry: AstArray, pathname: string): boolean {
  const { href, children } = splitEntry(entry);
  return href === pathname || children.some((child) => containsPath(child, pathname));
}

// Matches plugins/dita-bootstrap Customization/xsl/nav.xsl's collapsible-toc chevron;
// collapsible-toc.css rotates it via .bd-links .btn[aria-expanded='true'] svg
function Chevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 14l6-6-6-6"
      />
    </svg>
  );
}

function TocEntryItem({ entry, pathname }: { entry: AstArray; pathname: string }) {
  const { title, href, icon, iconStyle, children } = splitEntry(entry);
  const isActive = href === pathname;
  const isCurrentSection = isActive || children.some((child) => containsPath(child, pathname));
  const [expanded, setExpanded] = useState(isCurrentSection);

  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );

  if (children.length === 0) {
    const leafLabel = href ? (
      <Link href={href} className={`d-inline-flex align-items-center flex-shrink-1${isActive ? " active" : ""}`}>
        {content}
      </Link>
    ) : (
      <span className={isActive ? "active" : undefined}>{content}</span>
    );
    return (
      <li>
        <div className="d-flex flex-row ps-0">{leafLabel}</div>
      </li>
    );
  }

  const label = href ? (
    <Link href={href} className={`d-inline-flex align-items-center flex-shrink-1${isActive ? " active" : ""}`}>
      {content}
    </Link>
  ) : (
    <span
      className={`d-inline-flex align-items-center flex-shrink-1 ps-2${isCurrentSection ? " active" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={() => setExpanded((value) => !value)}
    >
      {content}
    </span>
  );

  return (
    <li>
      <div className="d-flex flex-row ps-0">
        <button
          type="button"
          className={`btn d-inline-flex align-items-center p-0 border-0${isCurrentSection ? " active" : ""}`}
          aria-expanded={expanded}
          aria-current={isCurrentSection ? "true" : undefined}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <Chevron />
        </button>
        {label}
      </div>
      <div className={`ps-2 collapse${expanded ? " show" : ""}`}>
        <ul className="list-unstyled fw-normal ps-4">
          {children.map((child, index) => (
            <TocEntryItem key={index} entry={child} pathname={pathname} />
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function Toc({ entries }: { entries: AstArray[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Table of contents"
      id="bs-sidebar-nav"
      role="navigation"
      className="d-flex flex-column h-100 overflow-y-auto"
    >
      <div className="overflow-y-auto">
        <div className="flex-column bd-links">
          <ul className="list-unstyled mb-0 py-3 pt-md-1">
            {entries.map((entry, index) => (
              <TocEntryItem key={index} entry={entry} pathname={pathname} />
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
