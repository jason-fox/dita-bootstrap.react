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
import "./prism-theme.css";
import Shell from "@/components/Shell";
import { fetchToc } from "@/lib/api";

export const metadata: Metadata = {
  title: "DITA Bootstrap JSON Viewer",
};

// mirrors dita-bootstrap's $BOOTSTRAP_TOPBAR_HDR: an externally swappable HTML
// fragment for the navbar brand, read from disk rather than hardcoded in JSX
// (see plugins/dita-bootstrap/includes/hdr.navbar.default.xml for the real plugin's version)
async function fetchHeaderHtml(): Promise<string> {
  return readFile(path.join(process.cwd(), "public/header.html"), "utf-8");
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [toc, headerHtml] = await Promise.all([
    fetchToc().catch(() => ({ toc: [] })),
    fetchHeaderHtml().catch(() => '<a class="navbar-brand" href="/">DITA Bootstrap JSON Viewer</a>'),
  ]);

  return (
    <html lang="en">
      <body>
        <Shell tocEntries={toc.toc} headerHtml={headerHtml}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
