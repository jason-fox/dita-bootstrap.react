"use client";

import { useState, type ReactNode } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Offcanvas from "react-bootstrap/Offcanvas";

import Header from "./Header";
import Toc from "./Toc";
import type { AstArray } from "../lib/api";

export default function Shell({
  tocEntries = [],
  navToc,
  title,
  docId,
  headerHtml,
  navLinksHtml,
  children,
}: {
  tocEntries?: AstArray[];
  navToc?: string;
  title: string;
  docId?: string;
  headerHtml: string;
  navLinksHtml: string;
  children: ReactNode;
}) {
  const [showSidebar, setShowSidebar] = useState(false);
  const hasSidebar = tocEntries.length > 0;

  return (
    <>
      <Header
        title={title}
        docId={docId}
        headerHtml={headerHtml}
        navLinksHtml={navLinksHtml}
        onToggleSidebar={hasSidebar ? () => setShowSidebar((value) => !value) : undefined}
      />
      <Container fluid="xxl" style={{ paddingTop: "76px" }}>
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
            <Col lg={10} as="main" className="py-3">
              {children}
            </Col>
          </Row>
        ) : (
          <main className="py-3">{children}</main>
        )}
      </Container>
    </>
  );
}
