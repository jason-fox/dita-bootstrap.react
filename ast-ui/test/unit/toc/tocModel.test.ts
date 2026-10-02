import { describe, expect, it } from "vitest";
import { parseTocEntry, stripHash, tocEntryContains } from "../../../src/toc/tocModel";
import type { AstArray } from "../../../src/types/ast";
import toc from "../../fixtures/sample-docs-toc.json";

const entries = toc.toc as AstArray[];
const components = entries[0];

describe("parseTocEntry", () => {
  it("reads title, href and nested children from a toc entry", () => {
    const parsed = parseTocEntry(components);
    expect(parsed.title).toBe("DITA Bookshelf");
    expect(parsed.href).toBeUndefined();
    expect(parsed.children).toHaveLength(1);
    expect(parseTocEntry(parsed.children[0])).toMatchObject({
      title: "Getting Started",
      href: "index.json",
    });
  });

  it("treats a non-object second element as a child, not props", () => {
    const child: AstArray = ["TocEntry", { title: "Leaf", href: "leaf.json" }];
    const parsed = parseTocEntry(["TocEntry", child]);
    expect(parsed.title).toBeUndefined();
    expect(parsed.children).toEqual([child]);
  });
});

describe("tocEntryContains", () => {
  it("finds a match anywhere in the nested entries", () => {
    const section = entries[1];
    expect(tocEntryContains(section, (e) => e.href === "mcp-server.json")).toBe(true);
    expect(tocEntryContains(section, (e) => e.href === "generating-ast.json")).toBe(false);
  });
});

describe("stripHash", () => {
  it("drops the fragment and passes undefined through", () => {
    expect(stripHash("topic.json#section")).toBe("topic.json");
    expect(stripHash(undefined)).toBeUndefined();
  });
});
