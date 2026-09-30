import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderNode } from "../../../../src/components/ast/renderNode";
import type { AstNode } from "../../../../src/types/ast";

function renderAst(node: AstNode, ctx = {}) {
  return render(<>{renderNode(node, 0, { docId: "guide", ...ctx })}</>);
}

describe("renderNode", () => {
  it("maps PascalCase types to react-bootstrap components", () => {
    const { container } = renderAst(["Alert", { variant: "info" }, "Heads up"]);
    expect(container.querySelector("div.alert.alert-info")?.textContent).toBe("Heads up");
  });

  it("renders lowercase types as plain HTML tags with nested children", () => {
    const { container } = renderAst(["div", { className: "box" }, ["p", "hello"]]);
    expect(container.querySelector("div.box > p")?.textContent).toBe("hello");
  });

  it("rewrites cross-topic hrefs against the doc set", () => {
    const { container } = renderAst(["a", { href: "intro.json" }, "Intro"]);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/guide/intro");
  });

  it("highlights a plain-text code block with Prism", () => {
    const { container } = renderAst([
      "pre",
      { className: "language-bash" },
      ["code", "echo hi"],
    ]);
    expect(container.querySelector("code.language-bash .token")).not.toBeNull();
  });

  it("routes onNavigate for internal links instead of following them", () => {
    const calls: Array<[string, string]> = [];
    const { container } = renderAst(["a", { href: "topics/intro.json" }, "Intro"], {
      onNavigate: (docId: string, topic: string) => calls.push([docId, topic]),
    });
    const link = container.querySelector("a")!;
    const notPrevented = link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    expect(notPrevented).toBe(false);
    expect(calls).toEqual([["guide", "topics/intro"]]);
  });
});
