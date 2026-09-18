import React, { useState, type CSSProperties } from "react";
import { isPropsObject, resolveStyle, type AstArray } from "../../frontend/lib/api";

// Ported from frontend/components/Toc.tsx: same visual variants (collapsible/list-group/nav-pill),
// but that version depends on next/link + usePathname, which don't exist in this standalone,
// non-Next.js render. Navigation calls back into onNavigate (wired to app.callServerTool() in
// client-entry.tsx) rather than a Link href - see the MCP Apps spec (SEP-1865) callServerTool API.
export interface TocNavProps {
  entries: AstArray[];
  navToc?: string;
  docId: string;
  activeTopicPath: string;
  theme?: "light" | "dark";
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
}

// toc.json hrefs are sibling <topic>.json paths (see CLAUDE.local.md's AST shape docs);
// strip the extension to get the topicPath render_topic_ui/get_topic_content expect.
function tocHrefToTopicPath(href: unknown): string | undefined {
  if (typeof href !== "string" || href.startsWith("http")) return undefined;
  if (!href.endsWith(".json") && !href.includes(".json#")) return undefined;
  return href.replace(/\.json(#.*)?$/, "");
}

function splitEntry(entry: AstArray) {
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
    topicPath: tocHrefToTopicPath(href),
    icon,
    iconStyle: resolveStyle(iconStyle) as CSSProperties | undefined,
    children,
  };
}

function containsActive(entry: AstArray, activeTopicPath: string): boolean {
  const { topicPath, children } = splitEntry(entry);
  return (
    topicPath === activeTopicPath ||
    children.some((child) => containsActive(child, activeTopicPath))
  );
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

function EntryLink({
  topicPath,
  active,
  className,
  docId,
  theme,
  onNavigate,
  children,
}: {
  topicPath?: string;
  active: boolean;
  className: string;
  docId: string;
  theme?: string;
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
  children: React.ReactNode;
}) {
  if (!topicPath) {
    return <span className={active ? `${className} active` : className}>{children}</span>;
  }
  return (
    <button
      type="button"
      className={`btn btn-link text-start p-0 border-0 ${className}${active ? " active" : ""}`}
      onClick={() => onNavigate?.(docId, topicPath, theme)}
    >
      {children}
    </button>
  );
}

function TocEntryItem({
  entry,
  activeTopicPath,
  docId,
  theme,
  onNavigate,
}: {
  entry: AstArray;
  activeTopicPath: string;
  docId: string;
  theme?: string;
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
}) {
  const { title, topicPath, icon, iconStyle, children } = splitEntry(entry);
  const isActive = topicPath === activeTopicPath;
  const isCurrentSection = isActive || children.some((c) => containsActive(c, activeTopicPath));
  const [expanded, setExpanded] = useState(isCurrentSection);

  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );

  if (children.length === 0) {
    return (
      <li>
        <div className="d-flex flex-row ps-0">
          <EntryLink
            topicPath={topicPath}
            active={isActive}
            className="d-inline-flex align-items-center flex-shrink-1"
            docId={docId}
            theme={theme}
            onNavigate={onNavigate}
          >
            {content}
          </EntryLink>
        </div>
      </li>
    );
  }

  const label = topicPath ? (
    <EntryLink
      topicPath={topicPath}
      active={isActive}
      className="d-inline-flex align-items-center flex-shrink-1"
      docId={docId}
      theme={theme}
      onNavigate={onNavigate}
    >
      {content}
    </EntryLink>
  ) : (
    <span
      className={`d-inline-flex align-items-center flex-shrink-1 ps-2${isCurrentSection ? " active" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={() => setExpanded((v) => !v)}
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
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <Chevron />
        </button>
        {label}
      </div>
      <div className={`ps-2 collapse${expanded ? " show" : ""}`}>
        <ul className="list-unstyled fw-normal ps-4">
          {children.map((child, i) => (
            <TocEntryItem
              key={i}
              entry={child}
              activeTopicPath={activeTopicPath}
              docId={docId}
              theme={theme}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </div>
    </li>
  );
}

function ListGroupEntryItem({
  entry,
  activeTopicPath,
  parentActive,
  docId,
  theme,
  onNavigate,
}: {
  entry: AstArray;
  activeTopicPath: string;
  parentActive: boolean;
  docId: string;
  theme?: string;
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
}) {
  const { title, topicPath, icon, iconStyle, children } = splitEntry(entry);
  const isActive = topicPath === activeTopicPath;
  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );
  return (
    <>
      <EntryLink
        topicPath={topicPath}
        active={isActive}
        className={`list-group-item list-group-item-action${parentActive ? " bg-body-tertiary" : ""}`}
        docId={docId}
        theme={theme}
        onNavigate={onNavigate}
      >
        {content}
      </EntryLink>
      {children.map((child, i) => (
        <ListGroupEntryItem
          key={i}
          entry={child}
          activeTopicPath={activeTopicPath}
          parentActive={isActive}
          docId={docId}
          theme={theme}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

function NavPillEntryItem({
  entry,
  activeTopicPath,
  docId,
  theme,
  onNavigate,
}: {
  entry: AstArray;
  activeTopicPath: string;
  docId: string;
  theme?: string;
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
}) {
  const { title, topicPath, icon, iconStyle, children } = splitEntry(entry);
  const isActive = topicPath === activeTopicPath;
  const isCurrentSection = isActive || children.some((c) => containsActive(c, activeTopicPath));
  const content = (
    <>
      {icon && <i className={icon} style={iconStyle} />}
      {title}
    </>
  );
  return (
    <>
      <EntryLink
        topicPath={topicPath}
        active={isCurrentSection}
        className="my-1 nav-link"
        docId={docId}
        theme={theme}
        onNavigate={onNavigate}
      >
        {content}
      </EntryLink>
      {children.length > 0 && (
        <nav className="nav nav-pills flex-column ps-3 mw-100 w-100">
          {children.map((child, i) => (
            <NavPillEntryItem
              key={i}
              entry={child}
              activeTopicPath={activeTopicPath}
              docId={docId}
              theme={theme}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      )}
    </>
  );
}

export default function TocNav({
  entries,
  navToc = "collapsible",
  docId,
  activeTopicPath,
  theme,
  onNavigate,
}: TocNavProps) {
  const isListGroup = navToc.startsWith("list-group");
  const isNavPill = navToc.startsWith("nav-pill");

  return (
    <nav aria-label="Table of contents" id="bs-sidebar-nav" role="navigation" className="d-flex flex-column h-100 overflow-y-auto">
      <div className={`overflow-y-auto${isNavPill ? " alert alert-light" : ""}`}>
        {isListGroup ? (
          <div className="list-group me-3">
            {entries.map((entry, i) => (
              <ListGroupEntryItem
                key={i}
                entry={entry}
                activeTopicPath={activeTopicPath}
                parentActive={false}
                docId={docId}
                theme={theme}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : isNavPill ? (
          <nav className="nav nav-pills flex-column navbar-light">
            {entries.map((entry, i) => (
              <NavPillEntryItem
                key={i}
                entry={entry}
                activeTopicPath={activeTopicPath}
                docId={docId}
                theme={theme}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        ) : (
          <div className="flex-column bd-links">
            <ul className="list-unstyled mb-0 py-3 pt-md-1">
              {entries.map((entry, i) => (
                <TocEntryItem
                  key={i}
                  entry={entry}
                  activeTopicPath={activeTopicPath}
                  docId={docId}
                  theme={theme}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
