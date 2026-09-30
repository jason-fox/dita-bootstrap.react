"use client";

import type React from "react";
import { Button, Collapse as BsCollapse, Offcanvas as BsOffcanvas } from "react-bootstrap";
import { useToggleContext } from "../../../context/ToggleContext";

export function OffcanvasFromAst({ id, ...props }: { id: string; [key: string]: unknown }) {
  const { isOpen, close } = useToggleContext();
  return <BsOffcanvas {...props} show={isOpen(id)} onHide={() => close(id)} />;
}

export function CollapseFromAst({
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

export function ToggleButtonFromAst({
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
