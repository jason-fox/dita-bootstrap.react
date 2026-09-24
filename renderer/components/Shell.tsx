"use client";

import { useState, useEffect, type ReactNode } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Offcanvas from "react-bootstrap/Offcanvas";

import Header from "./Header";
import Menubar from "./Menubar";
import Toc from "./Toc";
import AstRenderer from "./AstRenderer";
import type { AstArray } from "../lib/api";

export default function Shell({
  tocEntries = [],
  navToc,
  menubar,
  title,
  docId,
  lang,
  headerAst,
  footerAst,
  accessibility,
  onClearChat,
  onSearch,
  children,
}: {
  tocEntries?: AstArray[];
  navToc?: string;
  menubar?: boolean;
  title: string;
  docId?: string;
  lang?: string;
  headerAst?: AstArray;
  footerAst?: AstArray;
  accessibility?: { main?: string; nav?: string };
  onClearChat?: () => void;
  onSearch?: (query: string) => void;
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
    <div className="d-flex flex-column min-vh-100">
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
        onClearChat={onClearChat}
        onSearch={onSearch}
      />
      {menubar && <Menubar entries={tocEntries} docId={docId} />}
      <Container fluid="xxl" className="flex-grow-1 d-flex flex-column">
        {hasSidebar ? (
          <Row className="flex-grow-1">
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
                  <Toc entries={tocEntries} navToc={navToc} menubar={menubar} docId={docId} />
                </Offcanvas.Body>
              </Offcanvas>
            </div>
            <Col lg={10} as="main" id="content" tabIndex={-1} className="py-3 flex-grow-1 d-flex flex-column">
              {children}
            </Col>
          </Row>
        ) : (
          <main id="content" tabIndex={-1} className="py-3 flex-grow-1 d-flex flex-column">{children}</main>
        )}
      </Container>
      {footerAst && (
        <footer className="footer mt-auto py-3 bg-primary-subtle border-top">
          <AstRenderer nodes={[footerAst]} docId={docId} lang={lang} />
        </footer>
      )}
    </div>
  );
}
