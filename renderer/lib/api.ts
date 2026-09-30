import { API_URL, DATA_URL, type ChromeConfig, type DocSetInfo, type TocDoc, type TopicDoc } from "@dita-bootstrap/ast-ui";

let chromeCache: ChromeConfig | null = null;

function isDynamicServerUsage(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const { digest, message } = err as { digest?: unknown; message?: unknown };
  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    (typeof message === "string" && message.includes("DYNAMIC_SERVER_USAGE"))
  );
}

export async function fetchChrome(): Promise<ChromeConfig> {
  if (chromeCache) {
    return chromeCache;
  }
  let res: Response | null = null;
  try {
    res = await fetch(`${DATA_URL}/chrome.json`, { cache: "no-store" });
  } catch (err: unknown) {
    if (isDynamicServerUsage(err)) throw err;
    console.warn("[Info] chrome.json not found or unavailable, using default configuration.");
    return { texts: {} };
  }
  if (!res || !res.ok) {
    return { texts: {} };
  }
  try {
    const raw = await res.json();
    const texts = raw.texts ?? raw.text ?? raw.i18n;
    chromeCache = {
      ...raw,
      texts,
    };
    return chromeCache!;
  } catch (err: unknown) {
    if (isDynamicServerUsage(err)) throw err;
    console.warn("[Info] Failed to parse chrome.json, using default configuration.");
    return { texts: {} };
  }
}

export async function fetchDocs(): Promise<DocSetInfo[]> {
  const res = await fetch(`${API_URL}/docs`, { cache: "no-store" }).catch(
    () => null,
  );
  if (!res || !res.ok) return [];
  return res.json();
}

export async function fetchToc(docId?: string): Promise<TocDoc> {
  const relativePath =
    docId && docId !== "default" ? `${docId}/toc.json` : "toc.json";
  const res = await fetch(`${DATA_URL}/${relativePath}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${relativePath}: ${res.status}`);
  return res.json();
}

export async function fetchPage(
  docId: string,
  file: string,
): Promise<TopicDoc> {
  let cleanFile = file;
  if (docId && docId !== "default" && cleanFile.startsWith(`${docId}/`)) {
    cleanFile = cleanFile.slice(docId.length + 1);
  }
  const normalizedFile = cleanFile.endsWith(".json") ? cleanFile : `${cleanFile}.json`;
  const relativePath =
    docId && docId !== "default"
      ? `${docId}/${normalizedFile}`
      : normalizedFile;
  const res = await fetch(`${DATA_URL}/${relativePath}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to load ${relativePath}: ${res.status}`);
  return res.json();
}

// Matches a URL path array against available doc sets to separate docId from topic path
export function matchDocSet(
  segments: string[],
  docSets: DocSetInfo[],
): { docId: string; topicPath: string } {
  const fullPath = segments.join("/");
  // Sort by ID length descending to match longest path prefix first
  const sortedSets = [...docSets].sort((a, b) => b.id.length - a.id.length);

  for (const docSet of sortedSets) {
    if (docSet.id === "default") continue;
    if (fullPath === docSet.id || fullPath.startsWith(`${docSet.id}/`)) {
      const topicPath = fullPath.slice(docSet.id.length).replace(/^\//, "");
      return { docId: docSet.id, topicPath };
    }
  }

  // Fallback
  if (segments.length > 0) {
    return { docId: segments[0], topicPath: segments.slice(1).join("/") };
  }
  return { docId: "default", topicPath: "" };
}

