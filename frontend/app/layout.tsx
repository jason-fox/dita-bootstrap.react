import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./commonltr.css";
import "./bootswatch-static.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./common-bootstrap.css";
import "./collapsible-toc.css";
import "./side-toc.css";
import "./scrollspy-toc.css";
import "./prism-theme.css";
import Shell from "@/components/Shell";
import { fetchToc, type TocDoc } from "@/lib/api";

const FALLBACK_TITLE = "DITA Bootstrap JSON Viewer";

// dynamic because the title comes from toc.json (the map's own title cascade), not a static string
export async function generateMetadata(): Promise<Metadata> {
  const toc = await fetchToc().catch((): TocDoc => ({ toc: [] }));
  return { title: toc.title ?? FALLBACK_TITLE };
}

// mirrors dita-bootstrap's $BOOTSTRAP_TOPBAR_HDR: an externally swappable HTML fragment for
// the navbar brand, read from disk rather than hardcoded in JSX (see
// plugins/dita-bootstrap/includes/hdr.navbar.default.xml for the real plugin's version) -
// empty by default, in which case Header falls back to the toc-derived title instead
async function fetchPublicFragment(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "public", file), "utf-8").catch(
    () => "",
  );
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [toc, headerHtml, navLinksHtml] = await Promise.all([
    fetchToc().catch((): TocDoc => ({ toc: [] })),
    fetchPublicFragment("header.html"),
    fetchPublicFragment("nav-links.html"),
  ]);

  return (
    // bootstrap.min.css sets scroll-behavior: smooth on :root; this attribute tells Next.js's
    // router to coordinate with that instead of racing it, so navigation reliably lands at the
    // top of the new page (see console warning this silences)
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Shell
          tocEntries={toc.toc}
          navToc={toc.navToc}
          title={toc.title ?? FALLBACK_TITLE}
          headerHtml={headerHtml}
          navLinksHtml={navLinksHtml}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
