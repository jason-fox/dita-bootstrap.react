import MiniSearch from "minisearch";
import { PUBLIC_DATA_URL } from "./api";

export interface SearchDoc {
  id: string;
  title: string;
  shortdesc: string;
  keywords: string;
  text: string;
  lang?: string;
}

// must match the MiniSearch(options) used to build the index in
// data-store/src/index.ts - the serialized index only carries term data, not this config
const SEARCH_INDEX_OPTIONS = {
  fields: ["title", "shortdesc", "keywords", "text"],
  storeFields: ["title", "shortdesc", "lang"],
};

export async function loadSearchIndex(
  docId?: string,
): Promise<MiniSearch<SearchDoc>> {
  const relativePath =
    docId && docId !== "default" ? `${docId}/search-index.json` : "search-index.json";
  const res = await fetch(`${PUBLIC_DATA_URL}/${relativePath}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) {
    return new MiniSearch<SearchDoc>(SEARCH_INDEX_OPTIONS);
  }
  const json = await res.text();
  return MiniSearch.loadJSON<SearchDoc>(json, SEARCH_INDEX_OPTIONS);
}


