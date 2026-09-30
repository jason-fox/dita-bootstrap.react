"use client";

import type React from "react";
import { useId } from "react";
import {
  OverlayTrigger,
  Popover as BsPopover,
  Tooltip as BsTooltip,
} from "react-bootstrap";

// text/title are always plain strings (see tooltip.xsl/popover.xsl) - rich overlay content isn't
// supported since the AST's prop values are scalar-only
export function TooltipTriggerFromAst({
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

export function PopoverTriggerFromAst({
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
      <a {...props} onClick={(e: React.MouseEvent) => e.preventDefault()}>
        {children}
      </a>
    </OverlayTrigger>
  );
}
