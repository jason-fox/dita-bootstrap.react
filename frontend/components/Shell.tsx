"use client";

import { useState, useEffect, type ReactNode } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Offcanvas from "react-bootstrap/Offcanvas";

import Header from "./Header";
import Toc from "./Toc";
import AstRenderer from "./AstRenderer";
import type { AstArray } from "../lib/api";

export default function Shell({
  tocEntries = [],
  navToc,
  title,
  docId,
  lang,
  headerAst,
  footerAst,
  accessibility,
  children,
}: {
  tocEntries?: AstArray[];
  navToc?: string;
  title: string;
  docId?: string;
  lang?: string;
  headerAst?: AstArray;
  footerAst?: AstArray;
  accessibility?: { main?: string; nav?: string };
  children: ReactNode;
}) {
  const [showSidebar, setShowSidebar] = useState(false);
  const hasSidebar = tocEntries.length > 0;

  useEffect(() => {
    if (lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return (
    <>
      <div className="visually-hidden-focusable overflow-hidden p-2 bg-body-tertiary">
        <div className="container-xl">
          <a
            className="d-inline-flex m-1 btn btn-outline-primary btn-sm"
            href="#ariaid-title1"
          >
            {accessibility?.main || "Skip to main content"}
          </a>
          <a
            className="d-none d-md-inline-flex m-1 btn btn-outline-primary btn-sm"
            href="#bs-sidebar-nav"
          >
            {accessibility?.nav || "Skip to docs navigation"}
          </a>
        </div>
      </div>
      <Header
        headerAst={headerAst}
        title={title}
        docId={docId}
        lang={lang}
        onToggleSidebar={hasSidebar ? () => setShowSidebar((value) => !value) : undefined}
      />
      <Container fluid="xxl">
        {hasSidebar ? (
          <Row>
            <div className="col-lg-2 py-3 overflow-y-auto bs-sidebar">
              <Offcanvas
                id="bdSidebar"
                responsive="lg"
                show={showSidebar}
                onHide={() => setShowSidebar(false)}
              >
                <Offcanvas.Header closeButton>
                  <Offcanvas.Title>{title}</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0">
                  <Toc entries={tocEntries} navToc={navToc} docId={docId} />
                </Offcanvas.Body>
              </Offcanvas>
            </div>
            <Col lg={10} as="main" id="content" tabIndex={-1} className="py-3">
              {children}
            </Col>
          </Row>
        ) : (
          <main id="content" tabIndex={-1} className="py-3">{children}</main>
        )}
      </Container>
      {footerAst && (
        <footer className="footer mt-auto py-3 bg-primary-subtle border-top">
          <AstRenderer nodes={[footerAst]} docId={docId} lang={lang} />
        </footer>
      )}
    </>
  );
}
