import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PopoverTriggerFromAst } from "../../../../../src/components/ast/nodes/OverlayNodes";

describe("PopoverTriggerFromAst", () => {
  it("opens the popover without following the link href", () => {
    render(
      <PopoverTriggerFromAst text="Popover body" title="Note" href="/somewhere">
        trigger
      </PopoverTriggerFromAst>,
    );

    const notPrevented = fireEvent.click(screen.getByText("trigger"));

    expect(notPrevented).toBe(false);
    expect(screen.getByText("Popover body")).toBeTruthy();
  });
});
