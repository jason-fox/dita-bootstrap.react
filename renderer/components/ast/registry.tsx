import type React from "react";
import dynamic from "next/dynamic";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Carousel,
  Col,
  Container,
  Form,
  InputGroup,
  Nav,
  NavDropdown,
  Navbar,
  Offcanvas as BsOffcanvas,
  Pagination,
  Row,
  Tab,
  Table,
} from "react-bootstrap";
import { FaviconFromAst, IconFromAst } from "./nodes/IconNodes";
import {
  PopoverTriggerFromAst,
  TooltipTriggerFromAst,
} from "./nodes/OverlayNodes";
import {
  CollapseFromAst,
  OffcanvasFromAst,
  ToggleButtonFromAst,
} from "./nodes/ToggleNodes";

const InteractiveTable = dynamic(
  () => import("@/components/table/InteractiveTable"),
  {
    loading: () => (
      <div
        className="spinner-border spinner-border-sm text-primary"
        role="status"
      />
    ),
    ssr: false,
  },
);

// PascalCase AST types map to react-bootstrap components; anything not listed here falls
// through to `type` itself as a literal HTML tag (e.g. "div", "p", "a").
export const componentRegistry: Record<string, React.ElementType> = {
  Card,
  CardHeader: Card.Header,
  CardBody: Card.Body,
  CardFooter: Card.Footer,
  CardImg: Card.Img,
  CardTitle: Card.Title,
  CardLink: Card.Link,
  Button,
  Badge,
  Alert,
  AlertHeading: Alert.Heading,
  AlertLink: Alert.Link,
  Accordion,
  AccordionItem: Accordion.Item,
  AccordionHeader: Accordion.Header,
  AccordionBody: Accordion.Body,
  TabContainer: Tab.Container,
  TabContent: Tab.Content,
  TabPane: Tab.Pane,
  Nav,
  NavItem: Nav.Item,
  NavLink: Nav.Link,
  NavDropdown,
  NavDropdownItem: NavDropdown.Item,
  Navbar,
  NavbarBrand: Navbar.Brand,
  NavbarToggle: Navbar.Toggle,
  NavbarCollapse: Navbar.Collapse,
  Container,
  Row,
  Col,
  Form,
  InputGroup,
  InputGroupText: InputGroup.Text,
  FormControl: Form.Control,
  Icon: IconFromAst,
  Favicon: FaviconFromAst,
  favicon: FaviconFromAst,
  Carousel,
  CarouselItem: Carousel.Item,
  CarouselCaption: Carousel.Caption,
  Offcanvas: OffcanvasFromAst,
  OffcanvasHeader: BsOffcanvas.Header,
  OffcanvasTitle: BsOffcanvas.Title,
  OffcanvasBody: BsOffcanvas.Body,
  Collapse: CollapseFromAst,
  ToggleButton: ToggleButtonFromAst,
  Pagination,
  PaginationItem: Pagination.Item,
  Table,
  InteractiveTable,
  TooltipTrigger: TooltipTriggerFromAst,
  PopoverTrigger: PopoverTriggerFromAst,
};
