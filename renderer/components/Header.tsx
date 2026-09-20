"use client";

import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Search from "./Search";
import DarkModeToggle from "./DarkModeToggle";
import AstRenderer from "./AstRenderer";
import type { AstArray } from "../lib/api";

export default function Header({
  headerAst,
  title,
  docId,
  lang,
  onToggleSidebar,
}: {
  headerAst?: AstArray;
  title: string;
  docId?: string;
  lang?: string;
  onToggleSidebar?: () => void;
}) {
  if (headerAst) {
    return (
      <AstRenderer
        nodes={[headerAst]}
        docId={docId}
        lang={lang}
        onToggleSidebar={onToggleSidebar}
      />
    );
  }

  return (
    <Navbar className="navbar-dark bg-primary" variant="dark" data-bs-theme="dark" expand="lg" sticky="top">
      <Container fluid="xxl" className="px-4">
        {onToggleSidebar && (
          <button
            type="button"
            className="navbar-toggler p-2 me-2"
            aria-controls="bdSidebar"
            aria-label="Toggle docs navigation"
            onClick={onToggleSidebar}
          >
            <i className="bi bi-list" />
          </button>
        )}
        <a className="navbar-brand d-flex align-items-center fw-semibold" href="/">
          <img
            src="/favicon.svg"
            alt=""
            className="me-2"
            style={{ width: "1.75rem", height: "1.75rem", objectFit: "contain" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <span>{title}</span>
        </a>
        <Navbar.Toggle aria-controls="navbarContent" />
        <Navbar.Collapse id="navbarContent">
          <div className="navbar-nav ms-auto align-items-lg-center">
            {docId && <Search docId={docId} lang={lang} />}
            <DarkModeToggle />
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
