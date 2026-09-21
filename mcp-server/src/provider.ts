import fs from "node:fs";
import path from "node:path";
import MiniSearch from "minisearch";

export interface DocSetOasisMetadata {
  id: string;
  title: string;
  navtitle?: string;
  description?: string;
  category?: string;
  keywords?: string[];
  author?: string;
  prodinfo?: string;
  lang?: string;
  featured?: boolean;
  priority?: number;
  navToc?: string;
  scrollspyToc?: string;
}

export interface TopicDoc {
  meta: Record<string, unknown> & {
    title?: string;
    shortdesc?: string;
    keywords?: string[];
    breadcrumbs?: Array<{ title: string; href?: string }>;
  };
  content: unknown[];
  scrollspy?: unknown[];
}

export interface SearchHit {
  id: string;
  docId?: string;
  topicPath?: string;
  title: string;
  shortdesc: string;
  lang?: string;
  score: number;
}

const SEARCH_INDEX_OPTIONS = {
  fields: ["title", "shortdesc", "keywords", "text"],
  storeFields: ["title", "shortdesc", "lang"],
};

interface CachedIndex {
  miniSearch: MiniSearch<any>;
  mtime: number;
}

export class DocProvider {
  private dataDir: string;
  private indexCache = new Map<string, CachedIndex>();
  private docSetsCache: { data: DocSetOasisMetadata[]; timestamp: number } | null = null;
  private readonly DOC_SETS_CACHE_TTL_MS = 5000;

  constructor(dataDir: string) {
    this.dataDir = path.resolve(dataDir);
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  // walks dataDir recursively, discovering any folder containing a toc.json file
  public findDocSets(dir: string = this.dataDir): DocSetOasisMetadata[] {
    const isRootDir = dir === this.dataDir;
    if (isRootDir && this.docSetsCache && (Date.now() - this.docSetsCache.timestamp < this.DOC_SETS_CACHE_TTL_MS)) {
      return this.docSetsCache.data;
    }

    const results = this.scanDocSets(dir);

    // Dynamic ranking: Featured / Priority docs first, then alphabetical
    const featuredEnv = (process.env.FEATURED_DOCS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    results.sort((a, b) => {
      const isFeaturedA = a.featured || featuredEnv.includes(a.id);
      const isFeaturedB = b.featured || featuredEnv.includes(b.id);
      if (isFeaturedA !== isFeaturedB) return isFeaturedB ? 1 : -1;

      const prioA = a.priority ?? (featuredEnv.includes(a.id) ? 100 : 0);
      const prioB = b.priority ?? (featuredEnv.includes(b.id) ? 100 : 0);
      if (prioA !== prioB) return prioB - prioA;

      return a.title.localeCompare(b.title);
    });

    if (isRootDir) {
      this.docSetsCache = { data: results, timestamp: Date.now() };
    }
    return results;
  }

  private scanDocSets(dir: string): DocSetOasisMetadata[] {
    const results: DocSetOasisMetadata[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasToc = entries.some((e) => e.isFile() && e.name === "toc.json");

    if (hasToc) {
      const relPath = path.relative(this.dataDir, dir).split(path.sep).join("/");
      const id = relPath === "" ? "default" : relPath;
      const tocPath = path.join(dir, "toc.json");
      try {
        const toc = JSON.parse(fs.readFileSync(tocPath, "utf-8"));
        const parts = id.split("/");
        const category = parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;

        let description: string | undefined = toc.description ?? toc.shortdesc;
        let keywords: string[] | undefined = Array.isArray(toc.keywords) ? toc.keywords : undefined;
        let author: string | undefined = toc.author;
        let prodinfo: string | undefined = toc.prodinfo;
        let lang: string | undefined = toc.lang;
        let featured: boolean | undefined = toc.featured;
        let priority: number | undefined = typeof toc.priority === "number" ? toc.priority : undefined;

        const indexPath = path.join(dir, "index.json");
        if (fs.existsSync(indexPath)) {
          try {
            const indexDoc = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
            const meta = indexDoc.meta ?? {};
            if (meta.shortdesc) description = meta.shortdesc;
            if (Array.isArray(meta.keywords)) keywords = meta.keywords;
            if (meta.author) author = meta.author;
            if (meta.prodinfo) prodinfo = meta.prodinfo;
            if (meta.lang) lang = meta.lang;
            if (typeof meta.featured === "boolean") featured = meta.featured;
            if (typeof meta.priority === "number") priority = meta.priority;
          } catch (e) {
            console.error(`Error reading ${indexPath}:`, e);
          }
        }

        results.push({
          id,
          title: toc.title ?? id,
          navtitle: toc.navtitle ?? toc.title,
          description,
          category,
          keywords,
          author,
          prodinfo,
          lang,
          featured,
          priority,
          navToc: toc.navToc,
          scrollspyToc: toc.scrollspyToc,
        });
      } catch (e) {
        console.error(`Error reading ${tocPath}:`, e);
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push(...this.scanDocSets(path.join(dir, entry.name)));
      }
    }

    return results;
  }

  // walks docDir recursively, returning topic JSON paths relative to docDir
  public findTopicFiles(docDir: string, dir: string = docDir): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.findTopicFiles(docDir, fullPath));
      } else if (
        entry.name.endsWith(".json") &&
        entry.name !== "toc.json" &&
        entry.name !== "search-index.json"
      ) {
        results.push(path.relative(docDir, fullPath).split(path.sep).join("/"));
      }
    }
    return results;
  }

  public getToc(docId: string): unknown {
    if (docId && docId !== "default") {
      const docSets = this.findDocSets();
      const matched = docSets.find((ds) => docId === ds.id || docId.startsWith(`${ds.id}/`));
      if (matched) docId = matched.id;
    }
    const docSetDir = docId === "default" ? this.dataDir : path.join(this.dataDir, ...docId.split("/"));
    const tocPath = path.join(docSetDir, "toc.json");
    if (!fs.existsSync(tocPath)) {
      throw new Error(`TOC for doc set '${docId}' not found.`);
    }
    return JSON.parse(fs.readFileSync(tocPath, "utf-8"));
  }

  public getTopicDoc(docId: string, topicPath: string): TopicDoc {
    if (docId && docId !== "default" && topicPath.startsWith(`${docId}/`)) {
      topicPath = topicPath.slice(docId.length + 1);
    } else if (!docId || docId === "default") {
      const docSets = this.findDocSets();
      for (const ds of docSets) {
        if (ds.id !== "default" && topicPath.startsWith(`${ds.id}/`)) {
          docId = ds.id;
          topicPath = topicPath.slice(ds.id.length + 1);
          break;
        }
      }
    }

    const docSetDir = docId === "default" ? this.dataDir : path.join(this.dataDir, ...docId.split("/"));
    const cleanTopicFile = topicPath.endsWith(".json") ? topicPath : `${topicPath}.json`;
    const fullPath = path.join(docSetDir, cleanTopicFile);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Topic file '${topicPath}' not found in doc set '${docId}'.`);
    }

    return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  }

  private getCachedMiniSearch(indexPath: string): MiniSearch<SearchHit> | null {
    try {
      const stat = fs.statSync(indexPath);
      const cached = this.indexCache.get(indexPath);
      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.miniSearch;
      }

      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      const miniSearch = MiniSearch.loadJSON<SearchHit>(JSON.stringify(indexData), SEARCH_INDEX_OPTIONS);
      this.indexCache.set(indexPath, { miniSearch, mtime: stat.mtimeMs });
      return miniSearch;
    } catch (e) {
      console.error(`Failed to load search index at ${indexPath}:`, e);
      return null;
    }
  }

  public search(query: string, docId?: string, lang?: string): SearchHit[] {
    const docSets = this.findDocSets();
    const targetSets = docId
      ? docSets.filter((s) => s.id === docId || s.id.startsWith(`${docId}/`))
      : docSets;

    const allResults: SearchHit[] = [];

    for (const docSet of targetSets) {
      const docDir = docSet.id === "default" ? this.dataDir : path.join(this.dataDir, ...docSet.id.split("/"));
      const indexPath = path.join(docDir, "search-index.json");
      if (!fs.existsSync(indexPath)) continue;

      const miniSearch = this.getCachedMiniSearch(indexPath);
      if (!miniSearch) continue;

      try {
        const hits = miniSearch.search(query, {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 3, keywords: 2, shortdesc: 1.5 },
          filter: lang
            ? (result) => {
                if (!result.lang) return true;
                const docPrimary = (result.lang as string).split(/[-_]/)[0].toLowerCase();
                const filterPrimary = lang.split(/[-_]/)[0].toLowerCase();
                return docPrimary === filterPrimary;
              }
            : undefined,
        });

        const escapedDocSetId = docSet.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        for (const hit of hits.slice(0, 10)) {
          const rawTopicPath = hit.id.replace(new RegExp(`^${escapedDocSetId}/`), "");
          const hitId = docSet.id === "default" ? rawTopicPath : `${docSet.id}/${rawTopicPath}`;
          allResults.push({
            id: hitId,
            docId: docSet.id,
            topicPath: rawTopicPath,
            title: (hit.title as string) || hit.id,
            shortdesc: (hit.shortdesc as string) || "",
            lang: (hit.lang as string) || undefined,
            score: hit.score,
          });
        }
      } catch (e) {
        console.error(`Error querying search index at ${indexPath}:`, e);
      }
    }

    return allResults.sort((a, b) => b.score - a.score);
  }

  // Converts AST JSON tuples into clean Markdown text for LLMs
  public astToMarkdown(node: unknown, depth: number = 0): string {
    if (node === null || node === undefined) return "";
    if (typeof node === "string") return node;
    if (!Array.isArray(node) || node.length === 0) return "";

    const [type, maybeProps, ...rest] = node;
    const isProps =
      typeof maybeProps === "object" &&
      maybeProps !== null &&
      !Array.isArray(maybeProps);

    const props = isProps ? (maybeProps as Record<string, unknown>) : {};
    const children = (isProps ? rest : [maybeProps, ...rest]).filter(
      (child) => child !== undefined,
    );

    const childText = children
      .map((child) => this.astToMarkdown(child, depth + 1))
      .join("")
      .trim();

    const tag = String(type).toLowerCase();

    switch (tag) {
      case "article":
      case "section":
        return `\n\n${childText}\n\n`;

      case "h1":
        return `\n# ${childText}\n\n`;
      case "h2":
        return `\n## ${childText}\n\n`;
      case "h3":
        return `\n### ${childText}\n\n`;
      case "h4":
        return `\n#### ${childText}\n\n`;
      case "h5":
        return `\n##### ${childText}\n\n`;
      case "h6":
        return `\n###### ${childText}\n\n`;

      case "p":
        return `\n${childText}\n`;

      case "strong":
      case "b":
        return `**${childText}**`;

      case "em":
      case "i":
        return `*${childText}*`;

      case "hr":
        return "\n\n---\n\n";

      case "code":
        return childText.includes("\n") ? `\n\`\`\`\n${childText}\n\`\`\`\n` : `\`${childText}\``;

      case "codeblock":
      case "pre": {
        const rawLang = (props.outputclass as string) || (props.language as string) || (props.lang as string) || "xml";
        const lang = rawLang.replace(/^language-/, "").trim();
        return `\n\`\`\`${lang}\n${childText}\n\`\`\`\n`;
      }

      case "ul":
        return `\n${children.map((c) => `- ${this.astToMarkdown(c, depth + 1).trim()}`).join("\n")}\n`;

      case "ol":
        return `\n${children.map((c, i) => `${i + 1}. ${this.astToMarkdown(c, depth + 1).trim()}`).join("\n")}\n`;

      case "li":
        return childText;

      case "a":
      case "xref":
        const href = (props.href as string) || "#";
        return `[${childText || href}](${href})`;

      case "alert":
      case "note":
        const variant = (props.variant as string) || (props.type as string) || "note";
        return `\n> **${variant.toUpperCase()}:** ${childText}\n`;

      case "table": {
        const headerRows: string[][] = [];
        const bodyRows: string[][] = [];
        let colCount = 0;

        const rawChildren = (n: unknown): unknown[] => {
          if (!Array.isArray(n) || n.length === 0) return [];
          const [, maybeP, ...r] = n;
          const isP = typeof maybeP === "object" && maybeP !== null && !Array.isArray(maybeP);
          return (isP ? r : [maybeP, ...r]).filter((c) => c !== undefined);
        };
        const tagOf = (n: unknown) => (Array.isArray(n) && n.length > 0 ? String(n[0]).toLowerCase() : "");

        const collectRow = (n: unknown, target: string[][]) => {
          if (tagOf(n) !== "tr") return;
          const cells = rawChildren(n).map((c) =>
            this.astToMarkdown(c, depth + 1).trim().replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " "),
          );
          colCount = Math.max(colCount, cells.length);
          target.push(cells);
        };
        const walkSection = (n: unknown) => {
          const tg = tagOf(n);
          if (tg === "thead") rawChildren(n).forEach((k) => collectRow(k, headerRows));
          else if (tg === "tbody" || tg === "tfoot") rawChildren(n).forEach((k) => collectRow(k, bodyRows));
          else if (tg === "tr") collectRow(n, bodyRows);
        };
        children.forEach(walkSection);

        if (headerRows.length === 0 && bodyRows.length === 0) return "";
        const pad = (cells: string[]) => {
          const padded = [...cells];
          while (padded.length < colCount) padded.push("");
          return padded;
        };
        const header = headerRows[0] ?? bodyRows.shift() ?? [];
        const lines = [
          `| ${pad(header).join(" | ")} |`,
          `| ${(header.length ? header : Array(colCount).fill("")).map(() => "---").join(" | ")} |`,
          ...bodyRows.map((r) => `| ${pad(r).join(" | ")} |`),
        ];
        return `\n\n${lines.join("\n")}\n\n`;
      }

      default:
        return childText ? ` ${childText} ` : "";
    }
  }
}
