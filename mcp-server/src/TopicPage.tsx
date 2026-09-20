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
  previewMode?: boolean;
  onNavigate?: (docId: string, topicPath: string, theme?: string) => void;
}

export default function TopicPage({ docId, topicPath, doc, toc, theme, previewMode, onNavigate }: TopicPageProps) {
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const breadcrumbs = doc.meta.breadcrumbs;
  const title = (doc.meta.title as string) || topicPath;
  const shortdesc = (doc.meta.shortdesc as string) || "";
  const hasToc = Boolean(toc?.toc && toc.toc.length > 0);
  const showDesktopToc = hasToc && !previewMode;
  const hasScrollspy = Boolean(doc.scrollspy && doc.scrollspy.length > 0);

  const docTitle = toc?.title || (doc.meta.title as string) || title;

  const articleMarkup = (
    <article className="py-2 px-1">
      <div className="d-flex justify-content-between align-items-center mb-2">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} docId={docId} onNavigate={onNavigate} /> : <div />}
        {hasToc && (
          <button
            type="button"
            className={`btn btn-outline-secondary btn-sm d-flex align-items-center ms-2 ${showDesktopToc ? "d-lg-none" : ""}`}
            onClick={() => setShowTocDrawer(true)}
          >
            <i className="bi bi-list fs-6 pe-3"></i>
            <span>Table of Contents</span>
          </button>
        )}
      </div>
      {title && <h1 className="mb-3">{title}</h1>}
      {shortdesc && <p className="shortdesc text-body-secondary lead mb-4">{shortdesc}</p>}
      <AstRenderer nodes={doc.content as any} docId={docId} onNavigate={onNavigate} />
    </article>
  );

  const mainColClass =
    showDesktopToc && hasScrollspy
      ? "col-lg-7"
      : showDesktopToc
      ? "col-lg-10"
      : hasScrollspy
      ? "col-lg-9"
      : "col-12";

  return (
    <div className="container-fluid px-3 py-2">
      <div className="row g-4">
        {/* Left Sidebar TOC - Visible on Desktop matching frontend Shell layout when not in preview mode */}
        {showDesktopToc && (
          <div className="col-lg-2 d-none d-lg-block bs-sidebar py-3">
            <TocNav
              entries={toc!.toc}
              navToc={toc!.navToc}
              menubar={toc?.menubar}
              docId={docId}
              activeTopicPath={topicPath}
              theme={theme}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* Center Main Article Content */}
        <div className={mainColClass}>{articleMarkup}</div>

        {/* Right Sidebar Scrollspy */}
        {hasScrollspy && (
          <div className="col-lg-3 d-none d-lg-block py-3 border-start">
            <Scrollspy entries={doc.scrollspy as any} />
          </div>
        )}
      </div>

      {/* Mobile / Preview Drawer for TOC */}
      {hasToc && (
        <Offcanvas
          show={showTocDrawer}
          onHide={() => setShowTocDrawer(false)}
          placement="start"
          className={showDesktopToc ? "d-lg-none" : undefined}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>{docTitle}</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-3">
            <TocNav
              entries={toc!.toc}
              navToc={toc!.navToc}
              menubar={toc?.menubar}
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
    </div>
  );
}
