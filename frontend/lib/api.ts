const isServer = typeof window === "undefined";

export const DATA_URL = isServer
  ? (process.env.INTERNAL_DATA_URL ?? process.env.NEXT_PUBLIC_DATA_URL ?? "http://localhost:4000/data")
  : (process.env.NEXT_PUBLIC_DATA_URL ?? "http://localhost:4000/data");

export const API_URL = isServer
  ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api")
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api");

export interface DocSetInfo {
  id: string;
  title: string;
  description?: string;
  group?: string;
  navToc?: string;
  scrollspyToc?: string;
  menubar?: boolean;
  topicCount: number;
}

// [type, props?, ...children] - props is present only when item[1] is a plain object
export type AstNode = string | AstArray;
export type AstArray = [string, ...unknown[]];

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface TopicDoc {
  // meta.breadcrumbs (see plugins/dita-bootstrap.ast Customization/xsl/breadcrumb.xsl) is the
  // one non-string field; everything else is a plain string
  meta: Record<string, string> & { breadcrumbs?: BreadcrumbItem[] };
  content: AstNode[];
  // "on this page" nav (see Customization/xsl/scrollspy.xsl) - TocEntry-shaped tuples like toc.json.
  // Absent (not just empty) when --scrollspy-toc=none or there's nothing to link to.
  scrollspy?: AstArray[];
}

export interface TocDoc {
  toc: AstArray[];
  // derived from the map's title cascade (see map2ast-bootstrap.xsl) - absent only if the
  // map has no title anywhere (no map/@title, no mainbooktitle, no topic titles)
  title?: string;
  lang?: string;
  // raw --nav-toc/--scrollspy-toc transtype param values, passed through as-is for the
  // frontend to interpret; Toc.tsx branches on navToc (collapsible/list-group*/nav-pill*)
  navToc?: string;
  scrollspyToc?: string;
  menubar?: boolean;
  header?: AstArray;
  footer?: AstArray;
  accessibility?: { main?: string; nav?: string };
}

export function isPropsObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// the AST carries @style verbatim as a CSS text string (e.g. "font-size: 2rem; color: red;"),
// but React's DOM style prop must be a plain object
export function resolveStyle(style: unknown): unknown {
  if (typeof style !== "string") {
    return style;
  }
  const result: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const [property, value] = declaration.split(":");
    if (!property || !value) continue;
    const camelProperty = property
      .trim()
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    result[camelProperty] = value.trim();
  }
  return result;
}

// cross-topic hrefs point at sibling <topic>.json files; rewrite those to this app's /view/<docId>/<topic> routes
export function resolveHref(href: unknown, docId?: string): unknown {
  if (
    typeof href !== "string" ||
    href.startsWith("http") ||
    href.startsWith("//") ||
    href.startsWith("mailto:")
  ) {
    return href;
  }
  let cleanPath = href
    .replace(/\.(json|html)(#.*)?$/, (_, __, hash) => hash ?? "")
    .replace(/^(\.\.\/|\.\/|\/)+/, "");
  if (docId && docId !== "default") {
    cleanPath = cleanPath.replace(new RegExp(`^${docId}/`), "");
  }
  const prefix = docId && docId !== "default" ? `/${docId}` : "";
  return cleanPath ? `${prefix}/${cleanPath}` : `${prefix}`;
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

