"use client";

import React from "react";
import { resolveHref, type BreadcrumbItem } from "../lib/api";

// Matches plugins/dita-bootstrap Customization/xsl/breadcrumb.xsl's markup 1-to-1: nav/ol.breadcrumb/li.breadcrumb-item,
// current crumb (no href) rendered as a span with aria-current="page" instead of a link.
export default function Breadcrumbs({
  items,
  docId,
  onNavigate,
}: {
  items: BreadcrumbItem[];
  docId?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
}) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, index) => {
          const resolvedHref = item.href ? (resolveHref(item.href, docId) as string) : undefined;

          const handleClick = (e: React.MouseEvent) => {
            if (onNavigate && item.href) {
              e.preventDefault();
              const escapedDocId = (docId || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const cleanTopic = item.href
                .replace(/^(\.\.\/|\.\/|\/)+/, "")
                .replace(new RegExp(`^${escapedDocId}/`), "")
                .replace(/\.(json|html)(#.*)?$/, "");
              onNavigate(docId || "dita-bootstrap-sample", cleanTopic);
            }
          };

          return (
            <li
              key={index}
              className={`breadcrumb-item${resolvedHref ? "" : " active"}`}
              aria-current={resolvedHref ? undefined : "page"}
            >
              {resolvedHref ? (
                <a href={resolvedHref} onClick={handleClick}>
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
