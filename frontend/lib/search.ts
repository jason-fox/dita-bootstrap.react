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

export async function loadSearchIndex(): Promise<MiniSearch<SearchDoc>> {
  const res = await fetch(`${DATA_URL}/search-index.json`, {
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Failed to load search-index.json: ${res.status}`);
  const json = await res.text();
  return MiniSearch.loadJSON<SearchDoc>(json, SEARCH_INDEX_OPTIONS);
}
