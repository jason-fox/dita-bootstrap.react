import { resolveHref } from "@/lib/api";
import type { BreadcrumbItem } from "@/types/docs";

// Matches plugins/dita-bootstrap Customization/xsl/breadcrumb.xsl's markup 1-to-1: nav/ol.breadcrumb/li.breadcrumb-item,
// current crumb (no href) rendered as a span with aria-current="page" instead of a link.
export default function Breadcrumbs({
  items,
  docId,
}: {
  items: BreadcrumbItem[];
  docId?: string;
}) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, index) => {
          const resolvedHref = item.href ? (resolveHref(item.href, docId) as string) : undefined;

          return (
            <li
              key={index}
              className={`breadcrumb-item${resolvedHref ? "" : " active"}`}
              aria-current={resolvedHref ? undefined : "page"}
            >
              {resolvedHref ? (
                <a href={resolvedHref}>
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
