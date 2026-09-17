import { resolveHref, type BreadcrumbItem } from "../lib/api";

// Matches plugins/dita-bootstrap Customization/xsl/breadcrumb.xsl's markup 1-to-1: nav/ol.breadcrumb/li.breadcrumb-item,
// current crumb (no href) rendered as a span with aria-current="page" instead of a link.
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, index) => (
          <li
            key={index}
            className={`breadcrumb-item${item.href ? "" : " active"}`}
            aria-current={item.href ? undefined : "page"}
          >
            {item.href ? (
              <a href={resolveHref(item.href) as string}>{item.title}</a>
            ) : (
              <span>{item.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
