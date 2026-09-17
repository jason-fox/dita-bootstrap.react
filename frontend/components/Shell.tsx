"use client";

import { useState, type ReactNode } from "react";
import { Col, Container, Offcanvas, Row } from "react-bootstrap";
import Header from "./Header";
import Toc from "./Toc";
import type { AstArray } from "@/lib/api";

export default function Shell({
  tocEntries,
  headerHtml,
  children,
}: {
  tocEntries: AstArray[];
  headerHtml: string;
  children: ReactNode;
}) {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      <Header headerHtml={headerHtml} onToggleSidebar={() => setShowSidebar((value) => !value)} />
      <Container fluid="xxl" style={{ paddingTop: "76px" }}>
        <Row>
          <div className="col-lg-2 py-3 overflow-y-auto bs-sidebar">
            <Offcanvas
              id="bdSidebar"
              responsive="lg"
              show={showSidebar}
              onHide={() => setShowSidebar(false)}
            >
              <Offcanvas.Header closeButton>
                <Offcanvas.Title>DITA Bootstrap JSON Viewer</Offcanvas.Title>
              </Offcanvas.Header>
              <Offcanvas.Body className="p-0">
                <Toc entries={tocEntries} />
              </Offcanvas.Body>
            </Offcanvas>
          </div>
          <Col lg={10} as="main" className="py-3">
            {children}
          </Col>
        </Row>
      </Container>
    </>
  );
}
