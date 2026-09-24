"use client";

import { useState, useMemo } from "react";
import Shell from "@/components/Shell";
import AstRenderer from "@/components/AstRenderer";
import { isPropsObject, type AstNode, type DocSetInfo } from "@/lib/api";

function populateCardAst(node: AstNode, doc: DocSetInfo): AstNode {
  if (typeof node === "string") {
    return node;
  }
  if (!Array.isArray(node)) {
    return node;
  }

  const [type, ...rest] = node;
  const hasProps = rest.length > 0 && isPropsObject(rest[0]);
  const originalProps = hasProps ? (rest[0] as Record<string, unknown>) : {};
  const children = (hasProps ? rest.slice(1) : rest) as AstNode[];

  const props: Record<string, unknown> = { ...originalProps };

  if (props.href === "#" || (props.href && typeof props.href === "string")) {
    props.href = `/${doc.id}`;
  }

  let newChildren = children.map((child) => populateCardAst(child, doc));

  if (type === "CardTitle") {
    newChildren = newChildren.map((child) => {
      if (child === "" || child === undefined) {
        return doc.title;
      }
      if (Array.isArray(child) && child[0] === "span") {
        const spanProps = isPropsObject(child[1]) ? child[1] : undefined;
        const spanChildren = isPropsObject(child[1]) ? child.slice(2) : child.slice(1);
        const spanIsEmpty =
          spanChildren.length === 0 ||
          (spanChildren.length === 1 && spanChildren[0] === "");
        if (spanIsEmpty) {
          return spanProps ? ["span", spanProps, doc.title] : ["span", doc.title];
        }
      }
      return child;
    });
  } else if (type === "CardText") {
    newChildren = newChildren.map((child) => {
      if (child === "" || child === undefined) {
        return doc.description ?? "";
      }
      if (Array.isArray(child) && child[0] === "span") {
        const spanProps = isPropsObject(child[1]) ? child[1] : undefined;
        const spanChildren = isPropsObject(child[1]) ? child.slice(2) : child.slice(1);
        const spanIsEmpty =
          spanChildren.length === 0 ||
          (spanChildren.length === 1 && spanChildren[0] === "");
        if (spanIsEmpty) {
          return spanProps
            ? ["span", spanProps, doc.description ?? ""]
            : ["span", doc.description ?? ""];
        }
      }
      return child;
    });
  }

  return hasProps ? [type, props, ...newChildren] : [type, ...newChildren];
}

interface HomePageClientProps {
  docs: DocSetInfo[];
  chrome: Record<string, any> | null;
}

export default function HomePageClient({ docs, chrome }: HomePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const docsTitle = chrome?.["docs-page"]?.title ?? "Documentation";
  const headerAst = chrome?.["docs-page"]?.header;
  const cardTemplate = chrome?.["docs-page"]?.card;
  const footerAst = chrome?.footer;

  const sortedAndFilteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = q
      ? docs.filter(
          (doc) =>
            doc.title.toLowerCase().includes(q) ||
            (doc.description && doc.description.toLowerCase().includes(q)) ||
            doc.id.toLowerCase().includes(q)
        )
      : docs;

    return [...matched].sort((a, b) => {
      // 1. Featured docs first (featured: true)
      const aFeatured = a.featured === true ? 1 : 0;
      const bFeatured = b.featured === true ? 1 : 0;
      if (aFeatured !== bFeatured) {
        return bFeatured - aFeatured;
      }

      // 2. Numerical priority (lower number = higher priority)
      const aPrio = typeof a.priority === "number" ? a.priority : Infinity;
      const bPrio = typeof b.priority === "number" ? b.priority : Infinity;
      if (aPrio !== bPrio) {
        return aPrio - bPrio;
      }

      // 3. Alphabetical order by title (case-insensitive)
      const titleCompare = a.title.localeCompare(b.title, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (titleCompare !== 0) {
        return titleCompare;
      }

      // 4. Fallback alphabetical order by ID
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [docs, searchQuery]);

  return (
    <Shell
      title={docsTitle}
      headerAst={headerAst}
      footerAst={footerAst}
      texts={chrome?.texts}
      onSearch={setSearchQuery}
    >
      <div className="py-4 flex-grow-1 d-flex flex-column">
        {docs.length === 0 ? (
          <div className="text-center py-5 alert alert-info col-lg-8 mx-auto">
            <i className="bi bi-info-circle display-6 d-block mb-3" />
            <h4>No Documentation Sets Found</h4>
            <p className="mb-0">
              Ensure the data-store is running and point <code>DATA_DIR</code> at output directories containing documentation sets.
            </p>
          </div>
        ) : sortedAndFilteredDocs.length === 0 ? (
          <div className="text-center py-5 alert alert-warning col-lg-8 mx-auto">
            <i className="bi bi-search display-6 d-block mb-3" />
            <h4>No Matching Documentation Sets</h4>
            <p className="mb-0">
              No documentation sets found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
            {sortedAndFilteredDocs.map((doc) => (
              <div key={doc.id} className="col d-flex align-items-stretch">
                <div className="w-100 h-100 d-flex flex-column">
                  {cardTemplate && (
                    <AstRenderer nodes={[populateCardAst(cardTemplate, doc)]} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
