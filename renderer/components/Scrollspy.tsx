"use client";

import { useEffect, useState } from "react";
import { isPropsObject, type AstArray } from "../lib/api";

function splitEntry(entry: AstArray) {
  const [, maybeProps, ...rest] = entry;
  const hasProps = isPropsObject(maybeProps);
  const { title, href } = (hasProps ? maybeProps : {}) as {
    title?: string;
    href?: string;
  };
  const children = (
    hasProps ? rest : [maybeProps, ...rest].filter((v) => v !== undefined)
  ) as AstArray[];
  return { title, href, children };
}

function idOf(href: string | undefined): string | undefined {
  return href?.startsWith("#") ? href.slice(1) : undefined;
}

function collectIds(entries: AstArray[]): string[] {
  return entries.flatMap((entry) => {
    const { href, children } = splitEntry(entry);
    const id = idOf(href);
    return [...(id ? [id] : []), ...collectIds(children)];
  });
}

// react-bootstrap has no ScrollSpy equivalent, so this is a small IntersectionObserver stand-in.
// rootMargin roughly matches the sticky header height and Bootstrap's own "top third" heuristic.
function useActiveId(entries: AstArray[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = collectIds(entries);
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-84px 0px -70% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [entries]);

  return activeId;
}

// default/"list" variant: matches scrollspy.xsl's plain <nav><ul><li><a> fallback
function ListEntryItem({
  entry,
  activeId,
}: {
  entry: AstArray;
  activeId: string | null;
}) {
  const { title, href, children } = splitEntry(entry);
  const isActive = idOf(href) === activeId;
  return (
    <li>
      {href && (
        <a href={href} className={isActive ? "active" : undefined}>
          {title}
        </a>
      )}
      {children.length > 0 && (
        <ul>
          {children.map((child, index) => (
            <ListEntryItem key={index} entry={child} activeId={activeId} />
          ))}
        </ul>
      )}
    </li>
  );
}

// list-group variant: flat siblings, no ul/li wrapper (matches Bootstrap's list-group markup)
function ListGroupEntryItem({
  entry,
  activeId,
}: {
  entry: AstArray;
  activeId: string | null;
}) {
  const { title, href, children } = splitEntry(entry);
  const isActive = idOf(href) === activeId;
  return (
    <>
      {href && (
        <a
          href={href}
          className={`list-group-item list-group-item-action${isActive ? " active" : ""}`}
        >
          {title}
        </a>
      )}
      {children.map((child, index) => (
        <ListGroupEntryItem key={index} entry={child} activeId={activeId} />
      ))}
    </>
  );
}

// nav-pill variant: nested <nav class="nav nav-pills"> per level, matching Toc.tsx's own NavPillEntryItem
function NavPillEntryItem({
  entry,
  activeId,
}: {
  entry: AstArray;
  activeId: string | null;
}) {
  const { title, href, children } = splitEntry(entry);
  const isActive = idOf(href) === activeId;
  return (
    <>
      {href && (
        <a
          href={href}
          className={`my-1 ps-2 nav-link${isActive ? " active" : ""}`}
        >
          {title}
        </a>
      )}
      {children.length > 0 && (
        <nav className="nav nav-pills flex-column ps-3">
          {children.map((child, index) => (
            <NavPillEntryItem key={index} entry={child} activeId={activeId} />
          ))}
        </nav>
      )}
    </>
  );
}

// Matches plugins/dita-bootstrap Customization/xsl/scrollspy.xsl's three BOOTSTRAP_SCROLLSPY_TOC
// variants; wrapper positioning/link styling come from the vendored css/scrollspy-toc.css (.bs-scrollspy).
export default function Scrollspy({
  entries,
  variant = "list",
}: {
  entries: AstArray[];
  variant?: string;
}) {
  const activeId = useActiveId(entries);

  if (variant === "list-group") {
    return (
      <div className="bs-scrollspy">
        <div className="list-group" id="bs-scrollspy">
          {entries.map((entry, index) => (
            <ListGroupEntryItem key={index} entry={entry} activeId={activeId} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "nav-pill") {
    return (
      <div className="bs-scrollspy">
        <nav className="nav nav-pills flex-column" id="bs-scrollspy">
          {entries.map((entry, index) => (
            <NavPillEntryItem key={index} entry={entry} activeId={activeId} />
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="bs-scrollspy">
      <nav id="bs-scrollspy">
        <ul>
          {entries.map((entry, index) => (
            <ListEntryItem key={index} entry={entry} activeId={activeId} />
          ))}
        </ul>
      </nav>
    </div>
  );
}
