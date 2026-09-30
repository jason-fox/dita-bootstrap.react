"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type MiniSearch from "minisearch";
import { Form } from "react-bootstrap";
import { isPropsObject, resolveHref, resolveStyle } from "../../../lib/helpers";
import { loadSearchIndex, type SearchDoc } from "../../../lib/search";
import type { AstArray, AstNode } from "../../../types/ast";
import { componentRegistry } from "../registry";
import type { InterceptedNodeProps } from "../types";

export function SearchFormFromAst({ nodeKey, resolvedProps, children, ctx, render }: InterceptedNodeProps) {
  const { docId, lang, onSearch, noResultsText } = ctx;
  const indexRef = useRef<MiniSearch<SearchDoc> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string; shortdesc: string }>>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!docId) return;
    loadSearchIndex(docId)
      .then((index) => {
        indexRef.current = index;
      })
      .catch((error) => console.error("Failed to load search index", error));
  }, [docId]);

  function handleChange(value: string) {
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
    const index = indexRef.current;
    if (!index || value.trim().length === 0 || !docId) {
      setResults([]);
      setOpen(false);
      return;
    }
    const hits = index.search(value, {
      fuzzy: 0.2,
      prefix: true,
      boost: { title: 3, keywords: 2, shortdesc: 1.5 },
      filter: lang
        ? (result) => {
            if (!result.lang || !lang) return true;
            return result.lang.split(/[-_]/)[0].toLowerCase() === lang.split(/[-_]/)[0].toLowerCase();
          }
        : undefined,
    });
    setResults(
      hits.slice(0, 8).map((hit) => ({
        id: hit.id,
        title: (hit.title as string) || hit.id,
        shortdesc: (hit.shortdesc as string) || "",
      })),
    );
    setOpen(true);
  }

  const renderSearchChild = (node: AstNode, index: React.Key): React.ReactNode => {
    if (typeof node === "string") return node;
    const [childType, ...rest] = node;
    const hasProps = rest.length > 0 && isPropsObject(rest[0]);
    const props = hasProps ? (rest[0] as Record<string, unknown>) : {};
    const subChildren = (hasProps ? rest.slice(1) : rest) as AstNode[];

    if (childType === "FormControl" || childType === "input") {
      const formControlProps = {
        ...props,
        value: query,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value),
        onFocus: () => docId && query && results.length > 0 && setOpen(true),
      };
      return render([childType, formControlProps, ...subChildren] as AstArray, index);
    }

    const renderedSubChildren = subChildren.map((c, i) => renderSearchChild(c, i));
    const Component = componentRegistry[childType] ?? childType;
    const resolved = {
      ...props,
      ...(props.href ? { href: resolveHref(props.href, docId) } : {}),
      ...(props.style ? { style: resolveStyle(props.style) } : {}),
    };
    return React.createElement(Component, { key: index, ...resolved }, ...renderedSubChildren);
  };

  const renderedChildren = children.map((c, i) => renderSearchChild(c, i));

  const effectiveNoResultsText =
    (resolvedProps["data-no-results"] as string) ||
    (resolvedProps.noResults as string) ||
    noResultsText ||
    "No results";

  return (
    <Form
      key={nodeKey}
      {...resolvedProps}
      onSubmit={(e: React.FormEvent) => e.preventDefault()}
      onBlur={(e: React.FocusEvent<HTMLFormElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {renderedChildren}
      {open && (
        <ul className="dropdown-menu show w-100 mt-1" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {results.length === 0 ? (
            <li className="px-3 py-2 text-body-secondary">{effectiveNoResultsText}</li>
          ) : (
            results.map((result) => (
              <li key={result.id}>
                <Link
                  className="dropdown-item"
                  href={resolveHref(result.id, docId) as string}
                  onClick={() => setOpen(false)}
                >
                  <div className="fw-semibold">{result.title}</div>
                  {result.shortdesc && (
                    <div className="small text-body-secondary text-truncate">{result.shortdesc}</div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </Form>
  );
}
