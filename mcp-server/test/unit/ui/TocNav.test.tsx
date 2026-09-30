// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TocNav from "../../../src/ui/TocNav";

afterEach(cleanup);

const entries: Array<[string, ...unknown[]]> = [
  [
    "TocEntry",
    { title: "Guide" },
    ["TocEntry", { title: "Setup", href: "setup.json" }],
    ["TocEntry", { title: "Usage", href: "usage.json" }],
  ],
];

describe("TocNav", () => {
  it("navigates through onNavigate with the doc set and topic path", () => {
    const onNavigate = vi.fn();
    render(<TocNav entries={entries} docId="guide" activeTopicPath="setup" theme="dark" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText("Usage"));

    expect(onNavigate).toHaveBeenCalledWith("guide", "usage", "dark");
  });

  it("marks the current topic as active and opens its section", () => {
    render(<TocNav entries={entries} docId="guide" activeTopicPath="setup" onNavigate={vi.fn()} />);

    expect(screen.getByText("Setup").closest("a")?.className).toContain("active");
    expect(screen.getByText("Usage").closest("a")?.className).not.toContain("active");
  });
});
