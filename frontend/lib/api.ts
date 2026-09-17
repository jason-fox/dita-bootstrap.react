export const DATA_URL =
  process.env.NEXT_PUBLIC_DATA_URL ?? "http://localhost:4000/data";

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
  // raw --nav-toc/--scrollspy-toc transtype param values, passed through as-is for the
  // frontend to interpret; Toc.tsx branches on navToc (collapsible/list-group*/nav-pill*)
  navToc?: string;
  scrollspyToc?: string;
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

// cross-topic hrefs point at sibling <topic>.json files; rewrite those to this app's /view/<topic> routes
export function resolveHref(href: unknown): unknown {
  return typeof href === "string" &&
    href.endsWith(".json") &&
    !href.startsWith("http")
    ? `/view/${href.replace(/\.json(#.*)?$/, (_, hash) => hash ?? "")}`
    : href;
}

export async function fetchToc(): Promise<TocDoc> {
  const res = await fetch(`${DATA_URL}/toc.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load toc.json: ${res.status}`);
  return res.json();
}

export async function fetchPage(file: string): Promise<TopicDoc> {
  const name = file.endsWith(".json") ? file : `${file}.json`;
  const res = await fetch(`${DATA_URL}/${name}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`);
  return res.json();
}
