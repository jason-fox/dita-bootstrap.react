import MiniSearch from "minisearch";
import { DATA_URL } from "./api";

export interface SearchDoc {
  id: string;
  title: string;
  shortdesc: string;
  keywords: string;
  text: string;
}

// must match the MiniSearch(options) used to build the index in
// backend/server/index.ts - the serialized index only carries term data, not this config
const SEARCH_INDEX_OPTIONS = {
  fields: ["title", "shortdesc", "keywords", "text"],
  storeFields: ["title", "shortdesc"],
};

export async function loadSearchIndex(
  docId?: string,
): Promise<MiniSearch<SearchDoc>> {
  const relativePath =
    docId && docId !== "default" ? `${docId}/search-index.json` : "search-index.json";
  const res = await fetch(`${DATA_URL}/${relativePath}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) {
    return new MiniSearch<SearchDoc>(SEARCH_INDEX_OPTIONS);
  }
  const json = await res.text();
  return MiniSearch.loadJSON<SearchDoc>(json, SEARCH_INDEX_OPTIONS);
}


