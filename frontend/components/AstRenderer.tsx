"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Carousel,
  Collapse as BsCollapse,
  Nav,
  Offcanvas as BsOffcanvas,
  OverlayTrigger,
  Pagination,
  Popover as BsPopover,
  Tab,
  Table,
  Tooltip as BsTooltip,
} from "react-bootstrap";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-bash";
import {
  DATA_URL,
  isPropsObject,
  resolveHref,
  resolveStyle,
  type AstNode,
  type AstArray,
} from "../lib/api";

// Prism's DOMContentLoaded listener re-highlights the DOM after React renders, causing a
// hydration mismatch; Prism.manual can't be set in time, so no-op the listener instead.
if (typeof window !== "undefined") {
  Prism.highlightElement = () => {};
}

// Offcanvas/Collapse need real React state (unlike Tab/Accordion/Carousel's internal state)
// since their toggle button and target are AST siblings, not nested - coordinate via id here.
interface ToggleContextValue {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  close: (id: string) => void;
}

const ToggleContext = createContext<ToggleContextValue | null>(null);

function useToggleContext(): ToggleContextValue {
  const ctx = useContext(ToggleContext);
  if (!ctx)
    throw new Error(
      "Offcanvas/Collapse/ToggleButton AST nodes must render within AstRenderer",
    );
  return ctx;
}

function ToggleProvider({ children }: { children: React.ReactNode }) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const normalizeId = (id: string) => id.replace(/^(offcanvas|collapse)__/, "");
  const toggle = useCallback((id: string) => {
    const cleanId = normalizeId(id);
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(cleanId)) next.delete(cleanId);
      else next.add(cleanId);
      return next;
    });
  }, []);
  const close = useCallback((id: string) => {
    const cleanId = normalizeId(id);
    setOpenIds((prev) =>
      prev.has(cleanId)
        ? new Set([...prev].filter((existing) => existing !== cleanId))
        : prev,
    );
  }, []);
  const isOpen = useCallback(
    (id: string) => openIds.has(normalizeId(id)),
    [openIds],
  );
  const value = useMemo(
    () => ({ isOpen, toggle, close }),
    [isOpen, toggle, close],
  );
  return (
    <ToggleContext.Provider value={value}>{children}</ToggleContext.Provider>
  );
}

function OffcanvasFromAst({
  id,
  ...props
}: {
  id: string;
  [key: string]: unknown;
}) {
  const { isOpen, close } = useToggleContext();
  return <BsOffcanvas {...props} show={isOpen(id)} onHide={() => close(id)} />;
}

function CollapseFromAst({
  id,
  horizontal,
  children,
  ...props
}: {
  id: string;
  horizontal?: boolean;
  children?: React.ReactNode;
  [key: string]: unknown;
}) {
  const { isOpen } = useToggleContext();
  return (
    <BsCollapse in={isOpen(id)} dimension={horizontal ? "width" : "height"}>
      <div {...props}>{children}</div>
    </BsCollapse>
  );
}

function ToggleButtonFromAst({
  target,
  children,
  ...props
}: {
  target: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}) {
  const { toggle } = useToggleContext();
  return (
    <Button
      {...props}
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        toggle(target);
      }}
    >
      {children}
    </Button>
  );
}

// text/title are always plain strings (see tooltip.xsl/popover.xsl) - rich overlay content isn't
// supported since the AST's prop values are scalar-only
function TooltipTriggerFromAst({
  text,
  placement,
  children,
  ...props
}: {
  text: string;
  placement?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}) {
  const id = useId();
  return (
    <OverlayTrigger
      placement={(placement as never) ?? "top"}
      overlay={<BsTooltip id={id}>{text}</BsTooltip>}
    >
      <a {...props}>{children}</a>
    </OverlayTrigger>
  );
}

function PopoverTriggerFromAst({
  text,
  title,
  placement,
  children,
  ...props
}: {
  text: string;
  title?: string;
  placement?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}) {
  const id = useId();
  const overlay = (
    <BsPopover id={id}>
      {title && <BsPopover.Header as="h3">{title}</BsPopover.Header>}
      <BsPopover.Body>{text}</BsPopover.Body>
    </BsPopover>
  );
  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      placement={(placement as never) ?? "right"}
      overlay={overlay}
    >
      <a {...props}>{children}</a>
    </OverlayTrigger>
  );
}

// PascalCase AST types map to react-bootstrap components; anything not listed here falls
// through to `type` itself as a literal HTML tag (e.g. "div", "p", "a").
const componentRegistry: Record<string, React.ElementType> = {
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
  TooltipTrigger: TooltipTriggerFromAst,
  PopoverTrigger: PopoverTriggerFromAst,
};

// image/media srcs are relative to the topic's own JSON file in the output dir,
// not to this app's /view/<topic> route, so resolve them against the backend instead
function resolveSrc(src: unknown, docId?: string): unknown {
  if (
    typeof src !== "string" ||
    /^(https?:)?\/\//.test(src) ||
    src.startsWith("data:")
  ) {
    return src;
  }
  const prefix =
    docId && docId !== "default" ? `${DATA_URL}/${docId}` : DATA_URL;
  return `${prefix}/${src}`;
}

// DITA allows an ancestor-level default language that's resolved on the XSLT side, invisible
// here - fall back to "markup" (Prism degrades harmlessly on non-markup text either way).
function extractLanguage(className: unknown): string {
  if (typeof className === "string") {
    const match = className.match(/\blanguage-([\w-]+)\b/);
    if (match) return match[1];
  }
  return "markup";
}

// a ["code", props?, ...children] tuple's children, with props stripped off
function codeNodeChildren(codeNode: AstArray): AstNode[] {
  return (
    isPropsObject(codeNode[1]) ? codeNode.slice(2) : codeNode.slice(1)
  ) as AstNode[];
}

// Prism.highlight() needs one plain-text string; codeblocks with nested semantic markup
// (<cmdname>, <parmname>, ... - see keyword.xsl) fall through to normal recursion instead.
function isPlainTextCode(children: AstNode[]): children is string[] {
  return children.every((child) => typeof child === "string");
}

function renderCodeBlock(
  preProps: Record<string, unknown>,
  codeNode: AstArray,
  key: React.Key,
): React.ReactNode {
  const text = codeNodeChildren(codeNode).join("");
  const language = extractLanguage(preProps.className);
  const grammar = Prism.languages[language];
  if (!grammar) {
    return React.createElement(
      "pre",
      { key, ...preProps },
      React.createElement("code", null, text),
    );
  }
  const html = Prism.highlight(text, grammar, language);
  return React.createElement(
    "pre",
    { key, ...preProps },
    React.createElement("code", {
      className: `language-${language}`,
      dangerouslySetInnerHTML: { __html: html },
    }),
  );
}

function renderNode(
  node: AstNode,
  key: React.Key,
  docId?: string,
  onNavigate?: (docId: string, topicPath: string) => void,
): React.ReactNode {
  if (typeof node === "string") {
    return node;
  }

  const [type, ...rest] = node;
  const hasProps = rest.length > 0 && isPropsObject(rest[0]);
  const props = hasProps ? (rest[0] as Record<string, unknown>) : {};
  const children = (hasProps ? rest.slice(1) : rest) as AstNode[];
  const resolvedProps: Record<string, unknown> = {
    ...props,
    ...(props.href ? { href: resolveHref(props.href, docId) } : {}),
    ...(props.src ? { src: resolveSrc(props.src, docId) } : {}),
    ...(props.srcSet ? { srcSet: resolveSrc(props.srcSet, docId) } : {}),
    ...(props.srcset ? { srcSet: resolveSrc(props.srcset, docId) } : {}),
    ...(props.style ? { style: resolveStyle(props.style) } : {}),
  };

  // Intercept anchor <a> or <xref> link clicks inside AstRenderer
  if ((type === "a" || type === "xref") && typeof props.href === "string") {
    const rawHref = props.href;
    const isHash = rawHref.startsWith("#");
    const isExternal = rawHref.startsWith("http://") || rawHref.startsWith("https://");

    if (!isHash && !isExternal && onNavigate) {
      const cleanTopic = rawHref
        .replace(/^(\.\.\/|\.\/|\/)+/, "")
        .replace(new RegExp(`^${docId}/`), "")
        .replace(/\.(json|html)(#.*)?$/, "");

      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onNavigate(docId || "dita-bootstrap-sample", cleanTopic);
      };

      const renderedChildren = children.map((child, index) =>
        renderNode(child, index, docId, onNavigate),
      );
      return React.createElement(
        "a",
        { key, ...resolvedProps, onClick: handleClick },
        ...renderedChildren,
      );
    }
  }

  // a <pre> wrapping a plain-text <code> tuple is a codeblock - highlight it directly since
  // Prism needs raw text, not already-rendered nodes (isPlainTextCode gates the fallback case).
  if (
    type === "pre" &&
    children.length === 1 &&
    Array.isArray(children[0]) &&
    children[0][0] === "code"
  ) {
    const codeNode = children[0] as AstArray;
    if (isPlainTextCode(codeNodeChildren(codeNode))) {
      return renderCodeBlock(resolvedProps, codeNode, key);
    }
  }

  if (
    (type === "div" || type === "bodydiv") &&
    typeof resolvedProps.className === "string" &&
    resolvedProps.className.includes("collapse") &&
    resolvedProps.id
  ) {
    const isHorizontal = resolvedProps.className.includes("collapse-horizontal");
    const renderedChildren = children.map((child, index) => renderNode(child, index, docId, onNavigate));
    return (
      <CollapseFromAst
        key={key}
        id={resolvedProps.id as string}
        horizontal={isHorizontal}
        {...resolvedProps}
      >
        {renderedChildren}
      </CollapseFromAst>
    );
  }

  // an unregistered PascalCase type would otherwise silently render as an invalid DOM tag
  if (
    process.env.NODE_ENV !== "production" &&
    !componentRegistry[type] &&
    /^[A-Z]/.test(type)
  ) {
    console.warn(
      `AstRenderer: no componentRegistry entry for AST type "${type}"`,
    );
  }
  const Component = componentRegistry[type] ?? type;
  const rendered = children.map((child, index) => renderNode(child, index, docId, onNavigate));

  return React.createElement(Component, { key, ...resolvedProps }, ...rendered);
}

export default function AstRenderer({
  nodes,
  docId,
  onNavigate,
}: {
  nodes: AstNode[];
  docId?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
}) {
  return (
    <ToggleProvider>
      {nodes.map((node, index) => renderNode(node, index, docId, onNavigate))}
    </ToggleProvider>
  );
}

