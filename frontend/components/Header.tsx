import { Container, Navbar } from "react-bootstrap";

export default function Header({
  headerHtml,
  onToggleSidebar,
}: {
  headerHtml: string;
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
        {/* headerHtml comes from public/header.html, a build-time-editable file, not user input */}
        <span dangerouslySetInnerHTML={{ __html: headerHtml }} />
      </Container>
    </Navbar>
  );
}
