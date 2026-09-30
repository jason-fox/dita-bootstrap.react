import { describe, expect, it } from "vitest";
import { resolveHref, resolveStyle } from "../../../src/lib/helpers";

describe("resolveHref", () => {
  it("rewrites sibling topic files to in-app routes under the doc set", () => {
    expect(resolveHref("../topics/intro.json", "guide")).toBe("/guide/topics/intro");
  });

  it("strips a repeated doc set prefix and keeps hash fragments", () => {
    expect(resolveHref("guide/intro.json#top", "guide")).toBe("/guide/intro#top");
  });

  it("leaves external links alone", () => {
    expect(resolveHref("https://example.com/a.json", "guide")).toBe("https://example.com/a.json");
    expect(resolveHref("mailto:a@b.c", "guide")).toBe("mailto:a@b.c");
  });

  it("omits the prefix for the default doc set", () => {
    expect(resolveHref("intro.json", "default")).toBe("/intro");
  });
});

describe("resolveStyle", () => {
  it("turns a CSS text string into a camelCased style object", () => {
    expect(resolveStyle("font-size: 2rem; color: red;")).toEqual({
      fontSize: "2rem",
      color: "red",
    });
  });
});
