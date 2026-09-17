import { Container, Navbar } from "react-bootstrap";
import Search from "./Search";
import DarkModeToggle from "./DarkModeToggle";

export default function Header({
  title,
  headerHtml,
  navLinksHtml,
  onToggleSidebar,
}: {
  title: string;
  headerHtml: string;
  navLinksHtml: string;
  onToggleSidebar: () => void;
}) {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top">
      <Container fluid>
        <button
          type="button"
          className="navbar-toggler p-2 me-2"
          aria-controls="bdSidebar"
          aria-label="Toggle docs navigation"
          onClick={onToggleSidebar}
        >
          <i className="bi bi-list" />
        </button>
        {headerHtml ? (
          // headerHtml comes from public/header.html, a build-time-editable file, not user input
          <span dangerouslySetInnerHTML={{ __html: headerHtml }} />
        ) : (
          <a className="navbar-brand" href="/">
            {title}
          </a>
        )}

        <Navbar.Toggle aria-controls="navbarContent" />
        <Navbar.Collapse id="navbarContent">
          {/* navLinksHtml comes from public/nav-links.html, a build-time-editable file, not user input */}
          {navLinksHtml && (
            <div
              className="navbar-nav"
              dangerouslySetInnerHTML={{ __html: navLinksHtml }}
            />
          )}
          <div className="navbar-nav ms-auto align-items-lg-center">
            <Search />
            <DarkModeToggle />
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
