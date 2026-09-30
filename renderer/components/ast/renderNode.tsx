import React, { type Key } from "react";
import {
  isPropsObject,
  resolveHref,
  resolveSrc,
  resolveStyle,
} from "../../lib/api";
import type { AstArray, AstNode } from "../../types/ast";
import { isHighlightableCodeBlock, renderCodeBlock } from "./nodes/CodeBlock";
import { SearchFormFromAst } from "./nodes/SearchForm";
import {
  ThemeToggleButtonFromAst,
  ThemeToggleDropdownFromAst,
} from "./nodes/ThemeToggle";
import { CollapseFromAst } from "./nodes/ToggleNodes";
import { componentRegistry } from "./registry";
import type { InterceptedNodeProps, RenderChild, RenderContext } from "./types";

export function renderNode(
  node: AstNode,
  key: Key,
  ctx: RenderContext,
): React.ReactNode {
  if (typeof node === "string") {
    return node;
  }

  const {
    docId,
    title,
    activeTheme,
    onNavigate,
    onToggleSidebar,
    onClearChat,
    onSendPrompt,
  } = ctx;
  const render: RenderChild = (child, childKey) =>
    renderNode(child, childKey, ctx);

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
  const renderChildren = (nodes: AstNode[] = children) =>
    nodes.map((child, index) => render(child, index));

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
    const Component = componentRegistry[type] ?? type;
    return React.createElement(
      Component,
      { key, ...resolvedProps },
      ...renderChildren(brandChildren),
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

  const intercepted: InterceptedNodeProps = {
    nodeKey: key,
    resolvedProps,
    children,
    ctx,
    render,
  };

  // Intercept search form role or class
  if (
    resolvedProps.role === "search" ||
    (typeof resolvedProps.className === "string" &&
      resolvedProps.className.includes("search-box"))
  ) {
    return <SearchFormFromAst key={key} {...intercepted} />;
  }

  // Intercept theme toggle button role
  if (resolvedProps.role === "theme-toggle") {
    if (type === "NavDropdown" || type === "Dropdown") {
      return <ThemeToggleDropdownFromAst key={key} {...intercepted} />;
    }
    return (
      <ThemeToggleButtonFromAst key={key} nodeType={type} {...intercepted} />
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

      return React.createElement(
        "a",
        { key, ...resolvedProps, onClick: handleClick },
        ...renderChildren(),
      );
    }
  }

  // a <pre> wrapping a plain-text <code> tuple is a codeblock - highlight it directly since
  // Prism needs raw text, not already-rendered nodes.
  if (
    type === "pre" &&
    children.length === 1 &&
    Array.isArray(children[0]) &&
    children[0][0] === "code"
  ) {
    const codeNode = children[0] as AstArray;
    if (isHighlightableCodeBlock(codeNode)) {
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
    return (
      <CollapseFromAst
        key={key}
        id={resolvedProps.id as string}
        horizontal={isHorizontal}
        {...resolvedProps}
      >
        {renderChildren()}
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

  return React.createElement(
    Component,
    { key, ...resolvedProps },
    ...renderChildren(),
  );
}
