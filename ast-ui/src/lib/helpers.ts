import { PUBLIC_DATA_URL } from "./urls";

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
    const escapedDocId = docId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanPath = cleanPath.replace(new RegExp(`^${escapedDocId}/`), "");
  }
  const prefix = docId && docId !== "default" ? `/${docId}` : "";
  return cleanPath ? `${prefix}/${cleanPath}` : `${prefix}`;
}

// image/media srcs are relative to the topic's own JSON file in the output dir,
// not to this app's /view/<topic> route, so resolve them against the backend instead
export function resolveSrc(src: unknown, docId?: string): unknown {
  if (
    typeof src !== "string" ||
    /^(https?:)?\/\//.test(src) ||
    src.startsWith("data:")
  ) {
    return src;
  }
  const cleanSrc = src.replace(/^(\.\.\/|\.\/)+/, "");
  const prefix =
    docId && docId !== "default" ? `${PUBLIC_DATA_URL}/${docId}` : PUBLIC_DATA_URL;
  return `${prefix}/${cleanSrc}`;
}
