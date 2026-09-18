import React, { useState } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import AstRenderer from "../../frontend/components/AstRenderer";
import Breadcrumbs from "../../frontend/components/Breadcrumbs";
import Scrollspy from "../../frontend/components/Scrollspy";
import TocNav from "./TocNav";
import type { TopicDoc } from "./provider";
import type { TocDoc } from "../../frontend/lib/api";

export interface TopicPageProps {
  docId: string;
  topicPath: string;
  doc: TopicDoc;
  toc?: TocDoc;
  theme?: "light" | "dark";
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
}

export default function TopicPage({ docId, topicPath, doc, toc, theme, onNavigate }: TopicPageProps) {
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const breadcrumbs = doc.meta.breadcrumbs;
  const title = (doc.meta.title as string) || topicPath;
  const shortdesc = (doc.meta.shortdesc as string) || "";
  const hasToc = Boolean(toc?.toc && toc.toc.length > 0);

  const docTitle = toc?.title || (doc.meta.title as string) || title;

  const articleMarkup = (
    <article className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : <div />}
        {hasToc && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
            onClick={() => setShowTocDrawer(true)}
          >
            <i className="bi bi-list fs-6"></i>
            <span>Table of Contents</span>
          </button>
        )}
      </div>
      {title && <h1 className="mb-3">{title}</h1>}
      {shortdesc && <p className="shortdesc text-body-secondary lead mb-4">{shortdesc}</p>}
      <AstRenderer nodes={doc.content as any} docId={docId} onNavigate={onNavigate} />

      {hasToc && (
        <Offcanvas
          show={showTocDrawer}
          onHide={() => setShowTocDrawer(false)}
          placement="start"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title><i className="bi bi-book-half me-2"></i>{docTitle}</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-3">
            <TocNav
              entries={toc!.toc}
              navToc={toc!.navToc}
              docId={docId}
              activeTopicPath={topicPath}
              theme={theme}
              onNavigate={(d, t, th) => {
                setShowTocDrawer(false);
                if (onNavigate) onNavigate(d, t, th);
              }}
            />
          </Offcanvas.Body>
        </Offcanvas>
      )}
    </article>
  );

  const hasScrollspy = Boolean(doc.scrollspy);

  if (!hasScrollspy) {
    return articleMarkup;
  }

  return (
    <div className="row">
      <div className="col-lg-9">{articleMarkup}</div>
      {hasScrollspy && (
        <div className="col-lg-3 d-none d-lg-block p-4 border-start">
          <Scrollspy entries={doc.scrollspy as any} />
        </div>
      )}
    </div>
  );
}
