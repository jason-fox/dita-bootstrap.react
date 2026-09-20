"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
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

function containsPath(entry: AstArray, pathname: string, docId?: string): boolean {
  const { href, children } = splitEntry(entry, docId);
  const cleanHref = href ? href.split("#")[0] : undefined;
  const cleanPathname = pathname ? pathname.split("#")[0] : undefined;
  const isMatch = Boolean(cleanHref && cleanHref === cleanPathname);
  return isMatch || children.some((child) => containsPath(child, pathname, docId));
}

// Matches plugins/dita-bootstrap Customization/xsl/nav.xsl's collapsible-toc chevron;
// collapsible-toc.css rotates it via .bd-links .btn[aria-expanded='true'] svg
function Chevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
    >
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

function TocEntryItem({
  entry,
  pathname,
  docId,
}: {
  entry: AstArray;
  pathname: string;
  docId?: string;
}) {
  const { title, href, icon, iconStyle, children } = splitEntry(entry, docId);
  const cleanHref = href ? href.split("#")[0] : undefined;
  const cleanPathname = pathname ? pathname.split("#")[0] : undefined;
  const isActive = Boolean(cleanHref && cleanHref === cleanPathname);
  const isCurrentSection =
    isActive || children.some((child) => containsPath(child, pathname, docId));
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? isCurrentSection;

  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );

  if (children.length === 0) {
    const leafLabel = href ? (
      <Link
        href={href}
        className={`d-inline-flex align-items-center flex-shrink-1${isActive ? " active" : ""}`}
      >
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
    <Link
      href={href}
      className={`d-inline-flex align-items-center flex-shrink-1${isActive ? " active" : ""}`}
    >
      {content}
    </Link>
  ) : (
    <span
      className={`d-inline-flex align-items-center flex-shrink-1 ps-2${isCurrentSection ? " active" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={() => setUserExpanded(!expanded)}
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
          onClick={() => setUserExpanded(!expanded)}
        >
          <Chevron />
        </button>
        {label}
      </div>
      <div className={`ps-2 collapse${expanded ? " show" : ""}`}>
        <ul className="list-unstyled fw-normal ps-4">
          {children.map((child, index) => (
            <TocEntryItem key={index} entry={child} pathname={pathname} docId={docId} />
          ))}
        </ul>
      </div>
    </li>
  );
}

// Matches plugins/dita-bootstrap Customization/xsl/nav.xsl's list-group-toc mode: a single
// flat Bootstrap list-group, category headers and links as siblings, no nested wrapper per level.
function ListGroupEntryItem({
  entry,
  pathname,
  parentActive,
  docId,
}: {
  entry: AstArray;
  pathname: string;
  parentActive: boolean;
  docId?: string;
}) {
  const { title, href, icon, iconStyle, children } = splitEntry(entry, docId);
  const isActive = href === pathname;

  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );

  return (
    <>
      {href ? (
        <Link
          href={href}
          className={`list-group-item list-group-item-action${isActive ? " active" : ""}${
            parentActive ? " bg-body-tertiary" : ""
          }`}
        >
          {content}
        </Link>
      ) : (
        <span className="list-group-item bg-body-tertiary">{content}</span>
      )}
      {children.map((child, index) => (
        <ListGroupEntryItem
          key={index}
          entry={child}
          pathname={pathname}
          parentActive={isActive}
          docId={docId}
        />
      ))}
    </>
  );
}

function ListGroupToc({
  entries,
  pathname,
  docId,
}: {
  entries: AstArray[];
  pathname: string;
  docId?: string;
}) {
  return (
    <div className="list-group me-3">
      {entries.map((entry, index) => (
        <ListGroupEntryItem
          key={index}
          entry={entry}
          pathname={pathname}
          parentActive={false}
          docId={docId}
        />
      ))}
    </div>
  );
}

// Matches plugins/dita-bootstrap Customization/xsl/nav.xsl's nav-pill-toc mode: nested Bootstrap
// nav-pills, one <nav> per level, with ancestors of the active page also marked "active".
function NavPillEntryItem({
  entry,
  pathname,
  docId,
}: {
  entry: AstArray;
  pathname: string;
  docId?: string;
}) {
  const { title, href, icon, iconStyle, children } = splitEntry(entry, docId);
  const isActive = href === pathname;
  const isCurrentSection =
    isActive || children.some((child) => containsPath(child, pathname, docId));

  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );

  return (
    <>
      {href ? (
        <Link
          href={href}
          className={`my-1 nav-link${isCurrentSection ? " active" : ""}`}
        >
          {content}
        </Link>
      ) : (
        <span className="my-1 ps-3 navbar-brand pt-2 pb-1">{content}</span>
      )}
      {children.length > 0 && (
        <nav className="nav nav-pills flex-column ps-3 mw-100 w-100">
          {children.map((child, index) => (
            <NavPillEntryItem key={index} entry={child} pathname={pathname} docId={docId} />
          ))}
        </nav>
      )}
    </>
  );
}

function NavPillToc({
  entries,
  pathname,
  docId,
}: {
  entries: AstArray[];
  pathname: string;
  docId?: string;
}) {
  return (
    <nav className="nav nav-pills flex-column navbar-light">
      {entries.map((entry, index) => (
        <NavPillEntryItem key={index} entry={entry} pathname={pathname} docId={docId} />
      ))}
    </nav>
  );
}

export default function Toc({
  entries,
  navToc = "collapsible",
  menubar = false,
  docId,
}: {
  entries: AstArray[];
  navToc?: string;
  menubar?: boolean;
  docId?: string;
}) {
  const pathname = usePathname();
  const isListGroup = navToc.startsWith("list-group");
  const isNavPill = navToc.startsWith("nav-pill");

  const displayEntries = menubar
    ? entries.filter((entry) => containsPath(entry, pathname, docId))
    : entries;

  return (
    <nav
      aria-label="Table of contents"
      id="bs-sidebar-nav"
      tabIndex={-1}
      role="navigation"
      className="d-flex flex-column h-100 overflow-y-auto"
    >
      <div
        className={`overflow-y-auto${isNavPill ? " alert alert-light" : ""}`}
      >
        {isListGroup ? (
          <ListGroupToc entries={displayEntries} pathname={pathname} docId={docId} />
        ) : isNavPill ? (
          <NavPillToc entries={displayEntries} pathname={pathname} docId={docId} />
        ) : (
          <div className="flex-column bd-links">
            <ul className="list-unstyled mb-0 py-3 pt-md-1">
              {displayEntries.map((entry, index) => (
                <TocEntryItem key={index} entry={entry} pathname={pathname} docId={docId} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}

