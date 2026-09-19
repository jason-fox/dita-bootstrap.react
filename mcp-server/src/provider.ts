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
  score: number;
}

const SEARCH_INDEX_OPTIONS = {
  fields: ["title", "shortdesc", "keywords", "text"],
  storeFields: ["title", "shortdesc"],
};

export class DocProvider {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = path.resolve(dataDir);
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  // walks dataDir recursively, discovering any folder containing a toc.json file
  public findDocSets(dir: string = this.dataDir): DocSetOasisMetadata[] {
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
          navToc: toc.navToc,
          scrollspyToc: toc.scrollspyToc,
        });
      } catch (e) {
        console.error(`Error reading ${tocPath}:`, e);
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push(...this.findDocSets(path.join(dir, entry.name)));
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

  public search(query: string, docId?: string): SearchHit[] {
    const docSets = this.findDocSets();
    const targetSets = docId
      ? docSets.filter((s) => s.id === docId || s.id.startsWith(`${docId}/`))
      : docSets;

    const allResults: SearchHit[] = [];

    for (const docSet of targetSets) {
      const docDir = docSet.id === "default" ? this.dataDir : path.join(this.dataDir, ...docSet.id.split("/"));
      const indexPath = path.join(docDir, "search-index.json");
      if (!fs.existsSync(indexPath)) continue;

      try {
        const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
        const miniSearch = MiniSearch.loadJSON<SearchHit>(JSON.stringify(indexData), SEARCH_INDEX_OPTIONS);
        const hits = miniSearch.search(query, {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 3, keywords: 2, shortdesc: 1.5 },
        });

        for (const hit of hits.slice(0, 10)) {
          const rawTopicPath = hit.id.replace(new RegExp(`^${docSet.id}/`), "");
          const hitId = docSet.id === "default" ? rawTopicPath : `${docSet.id}/${rawTopicPath}`;
          allResults.push({
            id: hitId,
            docId: docSet.id,
            topicPath: rawTopicPath,
            title: (hit.title as string) || hit.id,
            shortdesc: (hit.shortdesc as string) || "",
            score: hit.score,
          });
        }
      } catch (e) {
        console.error(`Failed to load search index at ${indexPath}:`, e);
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

      case "code":
        return childText.includes("\n") ? `\n\`\`\`\n${childText}\n\`\`\`\n` : `\`${childText}\``;

      case "pre":
        return `\n\`\`\`\n${childText}\n\`\`\`\n`;

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

      default:
        return childText ? ` ${childText} ` : "";
    }
  }
}
