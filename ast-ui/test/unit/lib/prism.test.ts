import Prism from "prismjs";
import { describe, expect, it } from "vitest";
import { loadPrismLanguages } from "../../../src/lib/prism";

describe("loadPrismLanguages", () => {
  it("loads a language with its dependencies", async () => {
    await loadPrismLanguages(["typescript"]);
    expect(Prism.languages.typescript).toBeDefined();
    expect(Prism.languages.javascript).toBeDefined();
  });

  it("resolves aliases", async () => {
    await loadPrismLanguages(["yml"]);
    expect(Prism.languages.yaml).toBeDefined();
  });

  it("ignores unknown languages", async () => {
    await expect(loadPrismLanguages(["not-a-language", "../x"])).resolves.toBeUndefined();
  });
});
