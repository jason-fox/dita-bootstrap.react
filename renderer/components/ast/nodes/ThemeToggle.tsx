"use client";

import React, { type ComponentProps } from "react";
import { Button, NavDropdown } from "react-bootstrap";
import { useThemeMode, type ThemeMode } from "../../../hooks/useThemeMode";
import { isPropsObject } from "../../../lib/api";
import type { AstNode } from "../../../types/ast";
import { componentRegistry } from "../registry";
import type { InterceptedNodeProps } from "../types";
import { IconFromAst } from "./IconNodes";

export function ThemeToggleDropdownFromAst({
  nodeKey,
  resolvedProps,
  children,
  ctx,
  render,
}: InterceptedNodeProps) {
  const { mode, select } = useThemeMode();

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
  const dropdownAlign = (resolvedProps.align as ComponentProps<typeof NavDropdown>["align"]) || "end";
  const ariaLabel = (resolvedProps["aria-label"] as string) || "Toggle theme";
  const theme = (resolvedProps["data-bs-theme"] as string) || ctx.activeTheme;

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
              itemProps["value"]) as ThemeMode | undefined;
            const isActive = itemVal === mode;
            const subChildren = (
              hasProps ? child.slice(2) : child.slice(1)
            ) as AstNode[];

            return (
              <NavDropdown.Item
                key={index}
                active={isActive}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (itemVal) select(itemVal);
                }}
                className={`d-flex align-items-center gap-2 ${itemProps.className || ""}`.trim()}
                data-bs-theme-value={itemVal}
              >
                {subChildren.map((sub, sIdx) => render(sub, sIdx))}
                {isActive && <i className="bi bi-check2 ms-auto" />}
              </NavDropdown.Item>
            );
          }
        }
        return render(child, index);
      })}
    </NavDropdown>
  );
}

export function ThemeToggleButtonFromAst({
  nodeType,
  nodeKey,
  resolvedProps,
  children,
  render,
}: InterceptedNodeProps & { nodeType: string }) {
  const { mode, cycle } = useThemeMode();

  const handleCycle = (e: React.MouseEvent) => {
    e.preventDefault();
    cycle();
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
    return render(child, index);
  });

  const Component = componentRegistry[nodeType] ?? nodeType ?? Button;
  return React.createElement(
    Component,
    { key: nodeKey, ...resolvedProps, onClick: handleCycle },
    ...renderedChildren,
  );
}
