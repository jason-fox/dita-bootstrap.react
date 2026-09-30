import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AstRenderer from "../../../../src/components/ast/AstRenderer";
import type { AstNode } from "../../../../src/types/ast";
import collapse from "../../../fixtures/dita-bootstrap/collapse.json";

describe("AstRenderer with the dita-bootstrap collapse topic", () => {
  it("expands a collapse from its sibling toggle button", async () => {
    const { container } = render(<AstRenderer nodes={collapse.content as AstNode[]} docId="dita-bootstrap" />);
    const panel = container.querySelector("div.collapse:not(.collapse-horizontal)")!;
    expect(panel.classList.contains("show")).toBe(false);

    fireEvent.click(container.querySelector("button.btn-primary")!);

    await waitFor(() => expect(panel.classList.contains("show")).toBe(true));
  });

  it("renders the horizontal collapse variant collapsed", () => {
    const { container } = render(<AstRenderer nodes={collapse.content as AstNode[]} docId="dita-bootstrap" />);
    const panel = container.querySelector("div.collapse-horizontal")!;
    expect(panel.classList.contains("collapse-horizontal")).toBe(true);
    expect(panel.classList.contains("show")).toBe(false);
  });
});
