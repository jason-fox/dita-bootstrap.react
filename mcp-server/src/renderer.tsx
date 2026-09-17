import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AstRenderer from "../../frontend/components/AstRenderer";
import Breadcrumbs from "../../frontend/components/Breadcrumbs";
import Scrollspy from "../../frontend/components/Scrollspy";
import type { TopicDoc } from "./provider";

export function renderTopicToHtml(
  docId: string,
  topicPath: string,
  doc: TopicDoc,
  tocTitle?: string,
  theme: "light" | "dark" = "light"
): string {
  const breadcrumbs = doc.meta.breadcrumbs;
  const title = (doc.meta.title as string) || topicPath;
  const shortdesc = (doc.meta.shortdesc as string) || "";

  const articleMarkup = (
    <article className="p-4">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      {title && <h1 className="mb-3">{title}</h1>}
      {shortdesc && <p className="shortdesc text-body-secondary lead mb-4">{shortdesc}</p>}
      <AstRenderer nodes={doc.content as any} docId={docId} />
    </article>
  );

  const mainLayout = !doc.scrollspy ? (
    articleMarkup
  ) : (
    <div className="row">
      <div className="col-lg-8">{articleMarkup}</div>
      <div className="col-lg-4 d-none d-lg-block p-4 border-start">
        <Scrollspy entries={doc.scrollspy as any} />
      </div>
    </div>
  );

  const bodyHtml = renderToStaticMarkup(mainLayout);

  return `<!DOCTYPE html>
<html lang="en" data-bs-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} - ${escapeHtml(tocTitle ?? docId)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: transparent; }
    .shortdesc { font-weight: 400; color: var(--bs-secondary-color); }
    pre code { display: block; padding: 1rem; border-radius: 0.375rem; background: var(--bs-tertiary-bg); }
    .note { margin-top: 1rem; margin-bottom: 1rem; }
    .tabbed-dialog { border-bottom: 1px solid var(--bs-border-color); margin-bottom: 1rem; }
  </style>
</head>
<body className="p-2">
  <div className="container-fluid">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
