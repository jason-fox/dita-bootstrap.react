import { describe, expect, it } from "vitest";
import type { DocSetInfo } from "@dita-bootstrap/ast-ui";
import { matchDocSet } from "@/lib/api";

describe("matchDocSet", () => {
  const docSets = [{ id: "guide" }, { id: "guide/api" }] as DocSetInfo[];

  it("prefers the longest matching doc set id", () => {
    expect(matchDocSet(["guide", "api", "auth"], docSets)).toEqual({
      docId: "guide/api",
      topicPath: "auth",
    });
  });

  it("falls back to the first segment when nothing matches", () => {
    expect(matchDocSet(["other", "page"], docSets)).toEqual({
      docId: "other",
      topicPath: "page",
    });
  });
});
