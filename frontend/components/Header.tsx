"use client";

import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Search from "./Search";
import DarkModeToggle from "./DarkModeToggle";

export default function Header({
  title,
  docId,
  headerHtml,
  navLinksHtml,
  onToggleSidebar,
}: {
  title: string;
  docId?: string;
  headerHtml?: string;
  navLinksHtml?: string;
  onToggleSidebar?: () => void;
}) {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top">
      <Container fluid>
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

        {headerHtml ? (
          // headerHtml comes from public/header.html, a build-time-editable file, not user input
          <span dangerouslySetInnerHTML={{ __html: headerHtml }} />
        ) : (
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
        )}

        <Navbar.Toggle aria-controls="navbarContent" />
        <Navbar.Collapse id="navbarContent">
          {navLinksHtml && (
            <div
              className="navbar-nav"
              dangerouslySetInnerHTML={{ __html: navLinksHtml }}
            />
          )}
          <div className="navbar-nav ms-auto align-items-lg-center">
            {docId && <Search docId={docId} />}
            <DarkModeToggle />
          </div>

        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
