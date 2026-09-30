import { afterEach, describe, expect, it, vi } from "vitest";
import { renderAppShellHtml } from "../../../src/server/appShell";

afterEach(() => {
  vi.unstubAllEnvs();
});

const htmlTag = (html: string) => html.match(/<html[^>]*>/)?.[0] ?? "";

describe("renderAppShellHtml", () => {
  it("renders the viewer mount point with the client bundle inlined", () => {
    const html = renderAppShellHtml();
    expect(html).toContain('id="mcp-ui-root"');
    expect(html).toContain("bootstrap@5.3.3/dist/css/bootstrap.min.css");
    expect(html.length).toBeGreaterThan(500_000);
  });

  it("uses a Bootswatch stylesheet for a named theme", () => {
    const html = renderAppShellHtml("flatly");
    expect(html).toContain("bootswatch@5.3.3/dist/flatly/bootstrap.min.css");
    expect(htmlTag(html)).not.toContain("data-bs-theme");
  });

  it("forces dark mode for dark-only Bootswatch themes", () => {
    expect(htmlTag(renderAppShellHtml("darkly"))).toContain('data-bs-theme="dark"');
  });

  it("applies the language override", () => {
    expect(htmlTag(renderAppShellHtml(undefined, "de"))).toContain('lang="de"');
  });

  it("reads the navbar colour scheme from the environment", () => {
    vi.stubEnv("NAVBAR_THEME", "primary");
    vi.stubEnv("NAVBAR_TEXT", "light");
    const html = renderAppShellHtml();
    expect(html).toContain('colorScheme: "navbar-light"');
    expect(html).toContain('bgColor: "bg-primary"');
  });
});
