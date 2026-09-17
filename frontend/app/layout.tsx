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

export const metadata: Metadata = {
  title:
    process.env.NEXT_PUBLIC_DOCS_TITLE ??
    process.env.DOCS_TITLE ??
    "Documentation",
  description:
    process.env.NEXT_PUBLIC_DOCS_DESCRIPTION ??
    process.env.DOCS_DESCRIPTION ??
    "Documentation",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // bootstrap.min.css sets scroll-behavior: smooth on :root; this tells Next.js's router to
    // coordinate with that instead of racing it, so navigation reliably lands at the new page.
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

