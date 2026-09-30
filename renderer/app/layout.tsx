import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fetchChrome } from "@/lib/api";
import "@/styles/commonltr.css";
import "@/styles/bootswatch-colors.css";
import "@/styles/bootswatch-static.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/styles/common-bootstrap.css";
import "@/styles/collapsible-toc.css";
import "@/styles/side-toc.css";
import "@/styles/scrollspy-toc.css";
import "@/styles/prism-theme.css";

const DARK_ONLY_THEMES = new Set([
  "cyborg",
  "darkly",
  "slate",
  "solar",
  "superhero",
  "vapor",
]);

const openGraphBase = (process.env.OPEN_GRAPH_URL ?? "").trim();

export async function generateMetadata(): Promise<Metadata> {
  const chrome = await fetchChrome().catch(() => null);
  const docsTitle = chrome?.["docs-page"]?.title ?? "Documentation";
  const docsDescription = chrome?.["docs-page"]?.description ?? "Documentation";

  return {
    title: docsTitle,
    description: docsDescription,
    ...(openGraphBase
      ? {
          metadataBase: new URL(openGraphBase),
          openGraph: {
            title: docsTitle,
            description: docsDescription,
            type: "website",
            url: openGraphBase,
          },
          twitter: {
            card: "summary",
            title: docsTitle,
            description: docsDescription,
          },
        }
      : {}),
  };
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const rawTheme = (process.env.BOOTSTRAP_THEME ?? "default").trim();

  const themeName = rawTheme.toLowerCase();

  const rawCustomCssPath = (process.env.CUSTOM_CSS_PATH ?? "").trim();

  const isDarkOnly = DARK_ONLY_THEMES.has(themeName);
  const useBootswatch =
    themeName !== "" && themeName !== "default" && themeName !== "none";

  const themeStylesheetUrl = useBootswatch
    ? `https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist/${themeName}/bootstrap.min.css`
    : null;

  // Null check: default is add nothing
  const customCssUrl = rawCustomCssPath !== "" ? rawCustomCssPath : null;

  return (
    // bootstrap.min.css sets scroll-behavior: smooth on :root; this tells Next.js's router to
    // coordinate with that instead of racing it, so navigation reliably lands at the new page.
    <html
      lang={process.env.DEFAULT_LANGUAGE || "en"}
      data-scroll-behavior="smooth"
      {...(isDarkOnly ? { "data-bs-theme": "dark" } : {})}
    >
      <head>
        {themeStylesheetUrl ? (
          <link rel="stylesheet" href={themeStylesheetUrl} />
        ) : (
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          />
        )}
        {customCssUrl ? <link rel="stylesheet" href={customCssUrl} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
