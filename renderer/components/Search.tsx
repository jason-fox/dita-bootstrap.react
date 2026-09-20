"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type MiniSearch from "minisearch";
import { loadSearchIndex, type SearchDoc } from "../lib/search";
import { resolveHref } from "../lib/api";
import { useActiveTheme } from "../lib/theme";

interface SearchResult {
  id: string;
  title: string;
  shortdesc: string;
  lang?: string;
}

const MAX_RESULTS = 8;

export default function Search({ docId, lang }: { docId?: string; lang?: string }) {
  const activeTheme = useActiveTheme();
  const indexRef = useRef<MiniSearch<SearchDoc> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadSearchIndex(docId)
      .then((index) => {
        indexRef.current = index;
      })
      .catch((error) => console.error("Failed to load search index", error));
  }, [docId]);

function isLanguageMatch(docLang?: string, filterLang?: string): boolean {
  if (!filterLang || !docLang) return true;
  const docPrimary = docLang.split(/[-_]/)[0].toLowerCase();
  const filterPrimary = filterLang.split(/[-_]/)[0].toLowerCase();
  return docPrimary === filterPrimary;
}

  function handleChange(value: string) {
    setQuery(value);
    const index = indexRef.current;
    if (!index || value.trim().length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    const hits = index.search(value, {
      fuzzy: 0.2,
      prefix: true,
      boost: { title: 3, keywords: 2, shortdesc: 1.5 },
      filter: lang ? (result) => isLanguageMatch(result.lang, lang) : undefined,
    });
    setResults(
      hits.slice(0, MAX_RESULTS).map((hit) => ({
        id: hit.id,
        title: (hit.title as string) || hit.id,
        shortdesc: (hit.shortdesc as string) || "",
        lang: (hit.lang as string) || undefined,
      })),
    );
    setOpen(true);
  }

  const getResultHref = (id: string) => {
    return resolveHref(id, docId) as string;
  };

  return (
    <form
      className="position-relative mx-lg-2 search-box"
      role="search"
      data-bs-theme={activeTheme}
      onSubmit={(event) => event.preventDefault()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="input-group">
        <span className="input-group-text bg-primary-subtle">
          <i className="bi bi-search" />
        </span>
        <input
          type="search"
          className="form-control"
          placeholder="Search…"
          aria-label="Search"
          dir="auto"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => query && results.length > 0 && setOpen(true)}
        />
      </div>
      {open && (
        <ul
          className="dropdown-menu show w-100 mt-1"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-body-secondary">No results</li>
          ) : (
            results.map((result) => (
              <li key={result.id}>
                <Link
                  className="dropdown-item"
                  href={getResultHref(result.id)}
                  onClick={() => setOpen(false)}
                >
                  <div className="fw-semibold">{result.title}</div>
                  {result.shortdesc && (
                    <div className="small text-body-secondary text-truncate">
                      {result.shortdesc}
                    </div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </form>
  );
}

