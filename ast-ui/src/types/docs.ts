import type { AstArray, AstNode } from "./ast";

export interface DocSetInfo {
  id: string;
  title: string;
  description?: string;
  group?: string;
  navToc?: string;
  scrollspyToc?: string;
  menubar?: boolean;
  topicCount: number;
  featured?: boolean;
  priority?: number;
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface TopicDoc {
  // meta.breadcrumbs (see plugins/dita-bootstrap.ast Customization/xsl/breadcrumb.xsl),
  // meta.keywords, meta.titleAst and meta.shortdescAst are the non-string fields
  meta: Record<string, unknown> & {
    title?: string;
    // inline AST of the title, present only when the title contains markup; title stays the plain-text form
    titleAst?: AstNode[];
    shortdesc?: string;
    // inline AST of the shortdesc, present only when it contains markup
    shortdescAst?: AstNode[];
    lang?: string;
    keywords?: string[];
    breadcrumbs?: BreadcrumbItem[];
  };
  content: AstNode[];
  // "on this page" nav (see Customization/xsl/scrollspy.xsl) - TocEntry-shaped tuples like toc.json.
  // Absent (not just empty) when --scrollspy-toc=none or there's nothing to link to.
  scrollspy?: AstArray[];
}

export interface TocDoc {
  toc: AstArray[];
  // derived from the map's title cascade (see map2ast-bootstrap.xsl) - absent only if the
  // map has no title anywhere (no map/@title, no mainbooktitle, no topic titles)
  title?: string;
  lang?: string;
  // raw --nav-toc/--scrollspy-toc transtype param values, passed through as-is for the
  // frontend to interpret; Toc.tsx branches on navToc (collapsible/list-group*/nav-pill*)
  navToc?: string;
  scrollspyToc?: string;
  menubar?: boolean;
  header?: AstArray;
  footer?: AstArray;
  accessibility?: { main?: string; nav?: string };
  // Prism language names used by the doc set's codeblocks (see fox.jason.prismjs), loaded on demand
  codeLanguages?: string[];
}

export interface ChromeConfig {
  "docs-page"?: {
    title?: string;
    description?: string;
    header?: AstArray;
    card?: AstArray;
  };
  "chat-bot"?: {
    title?: string;
    description?: string;
    header?: AstArray;
    card?: AstArray;
    form?: AstArray;
  };
  footer?: AstArray;
  texts?: {
    noResults?: string;
    tableOfContents?: string;
    menubarNavigation?: string;
    expand?: string;
    collapse?: string;
  };
}
