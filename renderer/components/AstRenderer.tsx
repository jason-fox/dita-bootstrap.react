"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { loadSearchIndex, type SearchDoc } from "../lib/search";
import type MiniSearch from "minisearch";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Carousel,
  Col,
  Collapse as BsCollapse,
  Container,
  Form,
  FormControl,
  InputGroup,
  Nav,
  NavDropdown,
  Navbar,
  Offcanvas as BsOffcanvas,
  OverlayTrigger,
  Pagination,
  Popover as BsPopover,
  Row,
  Tab,
  Table,
  Tooltip as BsTooltip,
} from "react-bootstrap";
import dynamic from "next/dynamic";

const InteractiveTable = dynamic(() => import("./InteractiveTable"), {
  loading: () => (
    <div
      className="spinner-border spinner-border-sm text-primary"
      role="status"
    />
  ),
  ssr: false,
});
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-bash";
import {
  DATA_URL,
  PUBLIC_DATA_URL,
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

function FaviconFromAst({
  className = "me-2",
  style,
  ...props
}: {
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}) {
  const defaultStyle: React.CSSProperties = {
    width: "1.75rem",
    height: "1.75rem",
    objectFit: "contain",
  };
  return (
    <img
      src="/favicon.svg"
      alt=""
      className={className}
      style={style ?? defaultStyle}
      onError={(e) => (e.currentTarget.style.display = "none")}
      {...props}
    />
  );
}

function IconFromAst({
  name,
  className = "",
  ...props
}: {
  name?: string;
  className?: string;
  [key: string]: unknown;
}) {
  const iconName = name ?? "";
  const iconClass = iconName.startsWith("bi-") ? iconName : `bi-${iconName}`;
  return <i className={`bi ${iconClass} ${className}`.trim()} {...props} />;
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
  const cleanSrc = src.replace(/^(\.\.\/|\.\/)+/, "");
  const prefix =
    docId && docId !== "default" ? `${PUBLIC_DATA_URL}/${docId}` : PUBLIC_DATA_URL;
  return `${prefix}/${cleanSrc}`;
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

import { useActiveTheme } from "../lib/theme";

const STORAGE_KEY = "theme";
type Mode = "light" | "dark" | "auto";

function resolveTheme(mode: Mode): "light" | "dark" {
  if (mode === "auto") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyMode(mode: Mode) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-bs-theme", resolveTheme(mode));
  }
}

function ThemeToggleDropdownFromAst({
  nodeKey,
  resolvedProps,
  children,
  docId,
  lang,
  onNavigate,
  onToggleSidebar,
  activeTheme,
  title,
  onClearChat,
  onSendPrompt,
}: {
  nodeKey: React.Key;
  resolvedProps: Record<string, unknown>;
  children: AstNode[];
  docId?: string;
  lang?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
  onToggleSidebar?: () => void;
  activeTheme?: string;
  title?: string;
  onClearChat?: () => void;
  onSendPrompt?: (text: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as Mode | null)
        : null;
    const initial =
      stored && ["light", "dark", "auto"].includes(stored) ? stored : "auto";
    setMode(initial);
    applyMode(initial);
  }, []);

  const handleSelect = (selected: Mode) => {
    setMode(selected);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, selected);
    }
    applyMode(selected);
  };

  let activeIconNode: AstNode | undefined;
  for (const child of children) {
    if (Array.isArray(child) && child.length > 0) {
      const childProps = isPropsObject(child[1])
        ? (child[1] as Record<string, unknown>)
        : {};
      const val = childProps["data-bs-theme-value"] || childProps["value"];
      if (val === mode) {
        const subChildren = (
          isPropsObject(child[1]) ? child.slice(2) : child.slice(1)
        ) as AstNode[];
        for (const sub of subChildren) {
          if (Array.isArray(sub) && (sub[0] === "Icon" || sub[0] === "i")) {
            activeIconNode = sub;
            break;
          }
        }
        break;
      }
    }
  }

  const activeIconProps =
    activeIconNode && isPropsObject(activeIconNode[1])
      ? (activeIconNode[1] as Record<string, unknown>)
      : {};
  const activeIconName =
    (activeIconProps.name as string) ||
    (activeIconProps.className as string) ||
    (mode === "light"
      ? "brightness-high-fill"
      : mode === "dark"
        ? "moon-stars-fill"
        : "circle-half");

  const titleIcon = <IconFromAst name={activeIconName} className="fs-5" />;

  const dropdownId = (resolvedProps.id as string) || "bd-theme";
  const dropdownClassName = (resolvedProps.className as string) || "nav-item";
  const dropdownAlign = (resolvedProps.align as any) || "end";
  const ariaLabel = (resolvedProps["aria-label"] as string) || "Toggle theme";
  const theme = (resolvedProps["data-bs-theme"] as string) || activeTheme;

  return (
    <NavDropdown
      key={nodeKey}
      id={dropdownId}
      title={titleIcon}
      align={dropdownAlign}
      className={dropdownClassName}
      aria-label={ariaLabel}
      data-bs-theme={theme}
    >
      {children.map((child, index) => {
        if (Array.isArray(child) && child.length > 0) {
          const itemType = child[0];
          if (itemType === "NavDropdownItem" || itemType === "DropdownItem") {
            const hasProps = child.length > 1 && isPropsObject(child[1]);
            const itemProps = hasProps
              ? (child[1] as Record<string, unknown>)
              : {};
            const itemVal = (itemProps["data-bs-theme-value"] ||
              itemProps["value"]) as Mode | undefined;
            const isActive = itemVal === mode;
            const subChildren = (
              hasProps ? child.slice(2) : child.slice(1)
            ) as AstNode[];

            const renderedSubChildren = subChildren.map((sub, sIdx) =>
              renderNode(
                sub,
                sIdx,
                docId,
                lang,
                onNavigate,
                onToggleSidebar,
                activeTheme,
                title,
                onClearChat,
                onSendPrompt,
              ),
            );

            return (
              <NavDropdown.Item
                key={index}
                active={isActive}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (itemVal) handleSelect(itemVal);
                }}
                className={`d-flex align-items-center gap-2 ${itemProps.className || ""}`.trim()}
                data-bs-theme-value={itemVal}
              >
                {renderedSubChildren}
                {isActive && <i className="bi bi-check2 ms-auto" />}
              </NavDropdown.Item>
            );
          }
        }
        return renderNode(
          child,
          index,
          docId,
          lang,
          onNavigate,
          onToggleSidebar,
          activeTheme,
          title,
          onClearChat,
          onSendPrompt,
        );
      })}
    </NavDropdown>
  );
}

function ThemeToggleButtonFromAst({
  nodeKey,
  nodeType,
  resolvedProps,
  children,
  docId,
  lang,
  onNavigate,
  onToggleSidebar,
  activeTheme,
  title,
  onClearChat,
  onSendPrompt,
}: {
  nodeKey: React.Key;
  nodeType: string;
  resolvedProps: Record<string, unknown>;
  children: AstNode[];
  docId?: string;
  lang?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
  onToggleSidebar?: () => void;
  activeTheme?: string;
  title?: string;
  onClearChat?: () => void;
  onSendPrompt?: (text: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as Mode | null)
        : null;
    const initial =
      stored && ["light", "dark", "auto"].includes(stored) ? stored : "auto";
    setMode(initial);
    applyMode(initial);
  }, []);

  const handleCycle = (e: React.MouseEvent) => {
    e.preventDefault();
    const modes: Mode[] = ["light", "dark", "auto"];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    applyMode(next);
  };

  const activeIconName =
    mode === "light"
      ? "brightness-high-fill"
      : mode === "dark"
        ? "moon-stars-fill"
        : "circle-half";

  const renderedChildren = children.map((child, index) => {
    if (Array.isArray(child) && (child[0] === "Icon" || child[0] === "i")) {
      const childProps = isPropsObject(child[1])
        ? (child[1] as Record<string, unknown>)
        : {};
      return (
        <IconFromAst
          key={index}
          name={activeIconName}
          className={(childProps.className as string) || "fs-5"}
        />
      );
    }
    return renderNode(
      child,
      index,
      docId,
      lang,
      onNavigate,
      onToggleSidebar,
      activeTheme,
      title,
      onClearChat,
      onSendPrompt,
    );
  });

  const Component = componentRegistry[nodeType] ?? nodeType ?? Button;
  return React.createElement(
    Component,
    { key: nodeKey, ...resolvedProps, onClick: handleCycle },
    ...renderedChildren,
  );
}

function SearchFormFromAst({
  nodeKey,
  resolvedProps,
  children,
  docId,
  lang,
  onNavigate,
  onToggleSidebar,
  activeTheme,
  title,
  onClearChat,
  onSendPrompt,
  onSearch,
  noResultsText,
}: {
  nodeKey: React.Key;
  resolvedProps: Record<string, unknown>;
  children: AstNode[];
  docId?: string;
  lang?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
  onToggleSidebar?: () => void;
  activeTheme?: string;
  title?: string;
  onClearChat?: () => void;
  onSendPrompt?: (text: string) => void;
  onSearch?: (query: string) => void;
  noResultsText?: string;
}) {
  const indexRef = useRef<MiniSearch<SearchDoc> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; title: string; shortdesc: string }>
  >([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!docId) return;
    loadSearchIndex(docId)
      .then((index) => {
        indexRef.current = index;
      })
      .catch((error) => console.error("Failed to load search index", error));
  }, [docId]);

  function handleChange(value: string) {
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
    const index = indexRef.current;
    if (!index || value.trim().length === 0 || !docId) {
      setResults([]);
      setOpen(false);
      return;
    }
    const hits = index.search(value, {
      fuzzy: 0.2,
      prefix: true,
      boost: { title: 3, keywords: 2, shortdesc: 1.5 },
      filter: lang
        ? (result) => {
            if (!result.lang || !lang) return true;
            return (
              result.lang.split(/[-_]/)[0].toLowerCase() ===
              lang.split(/[-_]/)[0].toLowerCase()
            );
          }
        : undefined,
    });
    setResults(
      hits.slice(0, 8).map((hit) => ({
        id: hit.id,
        title: (hit.title as string) || hit.id,
        shortdesc: (hit.shortdesc as string) || "",
      })),
    );
    setOpen(true);
  }

  const renderSearchChild = (
    node: AstNode,
    index: React.Key,
  ): React.ReactNode => {
    if (typeof node === "string") return node;
    const [childType, ...rest] = node;
    const hasProps = rest.length > 0 && isPropsObject(rest[0]);
    const props = hasProps ? (rest[0] as Record<string, unknown>) : {};
    const subChildren = (hasProps ? rest.slice(1) : rest) as AstNode[];

    if (childType === "FormControl" || childType === "input") {
      const formControlProps = {
        ...props,
        value: query,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange(e.target.value),
        onFocus: () => docId && query && results.length > 0 && setOpen(true),
      };
      return renderNode(
        [childType, formControlProps, ...subChildren] as AstArray,
        index,
        docId,
        lang,
        onNavigate,
        onToggleSidebar,
        activeTheme,
        title,
        onClearChat,
        onSendPrompt,
        onSearch,
      );
    }

    const renderedSubChildren = subChildren.map((c, i) =>
      renderSearchChild(c, i),
    );
    const Component = componentRegistry[childType] ?? childType;
    const resolved = {
      ...props,
      ...(props.href ? { href: resolveHref(props.href, docId) } : {}),
      ...(props.style ? { style: resolveStyle(props.style) } : {}),
    };
    return React.createElement(
      Component,
      { key: index, ...resolved },
      ...renderedSubChildren,
    );
  };

  const renderedChildren = children.map((c, i) => renderSearchChild(c, i));

  const effectiveNoResultsText =
    (resolvedProps["data-no-results"] as string) ||
    (resolvedProps.noResults as string) ||
    noResultsText ||
    "No results";

  return (
    <Form
      key={nodeKey}
      {...resolvedProps}
      onSubmit={(e: React.FormEvent) => e.preventDefault()}
      onBlur={(e: React.FocusEvent<HTMLFormElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {renderedChildren}
      {open && (
        <ul
          className="dropdown-menu show w-100 mt-1"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-body-secondary">{effectiveNoResultsText}</li>
          ) : (
            results.map((result) => (
              <li key={result.id}>
                <Link
                  className="dropdown-item"
                  href={resolveHref(result.id, docId) as string}
                  onClick={() => setOpen(false)}
                >
                  <div className="fw-semibold">{result.title}</div>
                  {result.shortdesc && (
                    <div className="small text-body-secondary text-truncate">
                      {result.shortdesc}
                    </div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </Form>
  );
}

function renderNode(
  node: AstNode,
  key: React.Key,
  docId?: string,
  lang?: string,
  onNavigate?: (docId: string, topicPath: string) => void,
  onToggleSidebar?: () => void,
  activeTheme?: string,
  title?: string,
  onClearChat?: () => void,
  onSendPrompt?: (text: string) => void,
  onSearch?: (query: string) => void,
  noResultsText?: string,
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

  let nodeType = type;
  if (
    nodeType === "Table" &&
    (resolvedProps.searchable ||
      resolvedProps.sortable ||
      resolvedProps.paginated ||
      resolvedProps["data-search"] ||
      resolvedProps["data-sortable"] ||
      resolvedProps["data-pagination"])
  ) {
    nodeType = "InteractiveTable";
  }

  if (type === "NavbarBrand") {
    const brandTitle = title || "Documentation";
    const brandChildren = children.map((child) => {
      if (child === "" || child === undefined) {
        return brandTitle;
      }
      if (
        Array.isArray(child) &&
        child[0] === "span" &&
        (child.length === 1 ||
          (child.length === 2 && (child[1] === "" || child[1] === undefined)))
      ) {
        return ["span", brandTitle] as AstArray;
      }
      return child;
    });
    const renderedBrandChildren = brandChildren.map((child, index) =>
      renderNode(
        child,
        index,
        docId,
        lang,
        onNavigate,
        onToggleSidebar,
        activeTheme,
        title,
        onClearChat,
        onSendPrompt,
        onSearch,
        noResultsText,
      ),
    );
    const Component = componentRegistry[type] ?? type;
    return React.createElement(
      Component,
      { key, ...resolvedProps },
      ...renderedBrandChildren,
    );
  }

  // Automatically apply activeTheme to NavDropdown and Dropdown popups if not explicitly set
  if (
    activeTheme &&
    (type === "NavDropdown" ||
      type === "Dropdown" ||
      type === "DropdownButton") &&
    !resolvedProps["data-bs-theme"]
  ) {
    resolvedProps["data-bs-theme"] = activeTheme;
  }

  // Intercept search form role or class
  if (
    resolvedProps.role === "search" ||
    (typeof resolvedProps.className === "string" &&
      resolvedProps.className.includes("search-box"))
  ) {
    return (
      <SearchFormFromAst
        key={key}
        nodeKey={key}
        resolvedProps={resolvedProps}
        children={children}
        docId={docId}
        lang={lang}
        onNavigate={onNavigate}
        onToggleSidebar={onToggleSidebar}
        activeTheme={activeTheme}
        title={title}
        onClearChat={onClearChat}
        onSendPrompt={onSendPrompt}
        onSearch={onSearch}
        noResultsText={noResultsText}
      />
    );
  }

  // Intercept theme toggle button role
  if (resolvedProps.role === "theme-toggle") {
    if (type === "NavDropdown" || type === "Dropdown") {
      return (
        <ThemeToggleDropdownFromAst
          key={key}
          nodeKey={key}
          resolvedProps={resolvedProps}
          children={children}
          docId={docId}
          lang={lang}
          onNavigate={onNavigate}
          onToggleSidebar={onToggleSidebar}
          activeTheme={activeTheme}
          title={title}
          onClearChat={onClearChat}
          onSendPrompt={onSendPrompt}
        />
      );
    }
    return (
      <ThemeToggleButtonFromAst
        key={key}
        nodeKey={key}
        nodeType={type}
        resolvedProps={resolvedProps}
        children={children}
        docId={docId}
        lang={lang}
        onNavigate={onNavigate}
        onToggleSidebar={onToggleSidebar}
        activeTheme={activeTheme}
        title={title}
        onClearChat={onClearChat}
        onSendPrompt={onSendPrompt}
      />
    );
  }

  // Intercept sidebar toggle button click
  if (resolvedProps["aria-controls"] === "bdSidebar" && onToggleSidebar) {
    resolvedProps.onClick = (e: React.MouseEvent) => {
      e.preventDefault();
      onToggleSidebar();
    };
  }

  // Intercept anchor <a> or <xref> link clicks inside AstRenderer
  if ((type === "a" || type === "xref") && typeof props.href === "string") {
    const rawHref = props.href;
    const isHash = rawHref.startsWith("#");
    const isExternal =
      rawHref.startsWith("http://") ||
      rawHref.startsWith("https://") ||
      rawHref.startsWith("//") ||
      rawHref.startsWith("mailto:");

    if (!isHash && !isExternal && onNavigate && docId) {
      const escapedDocId = docId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cleanTopic = rawHref
        .replace(/^(\.\.\/|\.\/|\/)+/, "")
        .replace(new RegExp(`^${escapedDocId}/`), "")
        .replace(/\.(json|html)(#.*)?$/, "");

      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onNavigate(docId, cleanTopic);
      };

      const renderedChildren = children.map((child, index) =>
        renderNode(
          child,
          index,
          docId,
          lang,
          onNavigate,
          onToggleSidebar,
          activeTheme,
          title,
          onClearChat,
          onSendPrompt,
          onSearch,
          noResultsText,
        ),
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
    const isHorizontal = resolvedProps.className.includes(
      "collapse-horizontal",
    );
    const renderedChildren = children.map((child, index) =>
      renderNode(
        child,
        index,
        docId,
        lang,
        onNavigate,
        onToggleSidebar,
        activeTheme,
        title,
        onClearChat,
        onSendPrompt,
        onSearch,
        noResultsText,
      ),
    );
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

  // Intercept clear-chat button role
  if (resolvedProps.role === "clear-chat" && onClearChat) {
    resolvedProps.onClick = (e: React.MouseEvent) => {
      e.preventDefault();
      onClearChat();
    };
  }

  // Intercept quick prompt buttons
  if (type === "Button" && onSendPrompt && children.length > 0) {
    resolvedProps.onClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const text = children
        .map((c) =>
          typeof c === "string"
            ? c
            : Array.isArray(c)
              ? String(c[c.length - 1])
              : "",
        )
        .join("")
        .trim();
      if (text) onSendPrompt(text);
    };
  }

  // an unregistered PascalCase type would otherwise silently render as an invalid DOM tag
  if (
    process.env.NODE_ENV !== "production" &&
    !componentRegistry[nodeType] &&
    /^[A-Z]/.test(nodeType)
  ) {
    console.warn(
      `AstRenderer: no componentRegistry entry for AST type "${nodeType}"`,
    );
  }
  const Component = componentRegistry[nodeType] ?? nodeType;
  const rendered = children.map((child, index) =>
    renderNode(
      child,
      index,
      docId,
      lang,
      onNavigate,
      onToggleSidebar,
      activeTheme,
      title,
      onClearChat,
      onSendPrompt,
      onSearch,
      noResultsText,
    ),
  );

  return React.createElement(Component, { key, ...resolvedProps }, ...rendered);
}

export default function AstRenderer({
  nodes,
  title,
  docId,
  lang,
  onNavigate,
  onToggleSidebar,
  onClearChat,
  onSendPrompt,
  onSearch,
  noResultsText,
}: {
  nodes: AstNode[];
  title?: string;
  docId?: string;
  lang?: string;
  onNavigate?: (docId: string, topicPath: string) => void;
  onToggleSidebar?: () => void;
  onClearChat?: () => void;
  onSendPrompt?: (text: string) => void;
  onSearch?: (query: string) => void;
  noResultsText?: string;
}) {
  const activeTheme = useActiveTheme();

  return (
    <ToggleProvider>
      {nodes.map((node, index) =>
        renderNode(
          node,
          index,
          docId,
          lang,
          onNavigate,
          onToggleSidebar,
          activeTheme,
          title,
          onClearChat,
          onSendPrompt,
          onSearch,
          noResultsText,
        ),
      )}
    </ToggleProvider>
  );
}
