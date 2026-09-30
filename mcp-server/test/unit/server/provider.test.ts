import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DocProvider } from "../../../src/server/provider";

let dataDir: string;

function write(relPath: string, content: unknown) {
  const full = path.join(dataDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(content));
}

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-provider-"));
  write("guide/toc.json", { title: "Guide", lang: "en" });
  write("guide/index.json", {
    meta: { title: "Guide", shortdesc: "Start here", keywords: ["intro"] },
    content: [],
  });
  write("guide/setup.json", { meta: { title: "Setup" }, content: [["p", "hello"]] });
  write("guide/search-index.json", { index: true });
  write("reference/api/toc.json", { title: "API Reference", featured: true });
  write("zebra/toc.json", { title: "Zebra" });
  write("alpha/toc.json", { title: "Alpha" });
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

beforeEach(() => {
  vi.stubEnv("FEATURED_DOCS", "");
});

describe("DocProvider.findDocSets", () => {
  it("ranks featured doc sets first, then alphabetically by title", () => {
    const ids = new DocProvider(dataDir).findDocSets().map((ds) => ds.id);
    expect(ids).toEqual(["reference/api", "alpha", "guide", "zebra"]);
  });

  it("derives category from nested ids and description from the index topic", () => {
    const docSets = new DocProvider(dataDir).findDocSets();
    expect(docSets.find((ds) => ds.id === "reference/api")?.category).toBe("reference");
    expect(docSets.find((ds) => ds.id === "guide")).toMatchObject({
      description: "Start here",
      keywords: ["intro"],
      lang: "en",
    });
  });

  it("promotes doc sets named in FEATURED_DOCS", () => {
    vi.stubEnv("FEATURED_DOCS", "zebra");
    const ids = new DocProvider(dataDir).findDocSets().map((ds) => ds.id);
    expect(ids.slice(0, 2)).toEqual(["reference/api", "zebra"]);
  });
});

describe("DocProvider.getTopicDoc", () => {
  const provider = () => new DocProvider(dataDir);

  it("accepts a topic path with or without the doc set prefix and .json suffix", () => {
    expect(provider().getTopicDoc("guide", "guide/setup").meta.title).toBe("Setup");
    expect(provider().getTopicDoc("guide", "setup.json").meta.title).toBe("Setup");
  });

  it("resolves the doc set from the path when no doc id is given", () => {
    expect(provider().getTopicDoc("default", "guide/setup").meta.title).toBe("Setup");
  });

  it("throws for a missing topic", () => {
    expect(() => provider().getTopicDoc("guide", "missing")).toThrow(/not found/);
  });
});

describe("DocProvider.getToc and findTopicFiles", () => {
  it("returns a doc set's toc and rejects unknown doc sets", () => {
    const provider = new DocProvider(dataDir);
    expect(provider.getToc("guide")).toMatchObject({ title: "Guide" });
    expect(() => provider.getToc("nope")).toThrow(/not found/);
  });

  it("lists topic files without toc.json or search-index.json", () => {
    const files = new DocProvider(dataDir).findTopicFiles(path.join(dataDir, "guide"));
    expect(files.sort()).toEqual(["index.json", "setup.json"]);
  });
});

describe("DocProvider.astToMarkdown", () => {
  const md = (node: unknown) => new DocProvider(dataDir).astToMarkdown(node);

  it("converts headings, emphasis, lists and links", () => {
    const out = md([
      "article",
      ["h1", "Title"],
      ["p", "Hello ", ["strong", "world"]],
      ["ul", ["li", "one"], ["li", "two"]],
      ["a", { href: "https://example.com" }, "link"],
    ]);
    expect(out).toContain("# Title");
    expect(out).toContain("Hello **world**");
    expect(out).toContain("- one");
    expect(out).toContain("- two");
    expect(out).toContain("[link](https://example.com)");
  });

  it("fences code blocks with their language", () => {
    expect(md(["pre", { outputclass: "language-bash" }, "echo hi"])).toContain(
      "```bash\necho hi\n```",
    );
  });
});
