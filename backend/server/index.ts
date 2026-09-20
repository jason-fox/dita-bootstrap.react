import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import cluster from "node:cluster";
import express from "express";
import cors from "cors";
import MiniSearch from "minisearch";

const PORT = Number(process.env.PORT ?? 4000);
// point this at a dita2ast-bootstrap output directory to serve real content
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../data");

const envWorkers = process.env.WEB_CONCURRENCY || process.env.WORKERS;
const numWorkers = envWorkers
  ? Math.max(1, Number.parseInt(envWorkers, 10))
  : process.env.CLUSTER_MODE === "true"
    ? Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length)
    : 1;

interface DocSetInfo {
  id: string;
  title: string;
  description?: string;
  group?: string;
  navToc?: string;
  scrollspyToc?: string;
  menubar?: boolean;
  topicCount: number;
}

interface SearchDoc {
  id: string;
  title: string;
  shortdesc: string;
  keywords: string;
  text: string;
  lang?: string;
}

// must match the MiniSearch.loadJSON() options in frontend/lib/search.ts -
// the serialized index only carries term data, not this config
const SEARCH_INDEX_OPTIONS = {
  fields: ["title", "shortdesc", "keywords", "text"],
  storeFields: ["title", "shortdesc", "lang"],
};

// flattens an AST [type, props?, ...children] tree to its string leaves
function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (!Array.isArray(node)) return "";
  const [, maybeProps, ...rest] = node;
  const isProps =
    typeof maybeProps === "object" &&
    maybeProps !== null &&
    !Array.isArray(maybeProps);
  const children = isProps
    ? rest
    : [maybeProps, ...rest].filter((item) => item !== undefined);
  return children.map(extractText).join(" ");
}

// walks docDir recursively, returning topic JSON paths relative to docDir (POSIX
// separators, so ids match topic paths regardless of host OS)
function findTopicFiles(docDir: string, dir: string = docDir): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTopicFiles(docDir, fullPath));
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

// walks dataDir recursively, discovering any folder containing a toc.json file
function findDocSets(dataDir: string, dir: string = dataDir): DocSetInfo[] {
  const results: DocSetInfo[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const hasToc = entries.some((e) => e.isFile() && e.name === "toc.json");

  if (hasToc) {
    const relPath = path.relative(dataDir, dir).split(path.sep).join("/");
    const id = relPath === "" ? "default" : relPath;
    const tocPath = path.join(dir, "toc.json");
    try {
      const toc = JSON.parse(fs.readFileSync(tocPath, "utf-8"));
      const parts = id.split("/");
      const group = parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;
      const topicCount = findTopicFiles(dir).length;

      let description: string | undefined = toc.description ?? toc.shortdesc;
      const indexPath = path.join(dir, "index.json");
      if (fs.existsSync(indexPath)) {
        try {
          const indexDoc = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
          const shortdesc =
            indexDoc.meta?.shortdesc ??
            indexDoc.meta?.shortDesc ??
            (typeof indexDoc.shortdesc === "string" ? indexDoc.shortdesc : undefined) ??
            (typeof indexDoc.shortDesc === "string" ? indexDoc.shortDesc : undefined);
          if (shortdesc) {
            description = shortdesc;
          }
        } catch (e) {
          console.error(`Error reading ${indexPath}:`, e);
        }
      }

      results.push({
        id,
        title: toc.title ?? id,
        description,
        group,
        navToc: toc.navToc,
        scrollspyToc: toc.scrollspyToc,
        menubar: toc.menubar,
        topicCount,
      });
    } catch (e) {
      console.error(`Error reading ${tocPath}:`, e);
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      results.push(...findDocSets(dataDir, path.join(dir, entry.name)));
    }
  }

  return results;
}

// builds a MiniSearch index from every topic JSON in docDir (recursively) and writes
// it as search-index.json inside docDir
function buildSearchIndex(docDir: string): void {
  if (!fs.existsSync(docDir)) return;
  const files = findTopicFiles(docDir);
  if (files.length === 0) {
    return;
  }

  let tocLang: string | undefined;
  const tocPath = path.join(docDir, "toc.json");
  if (fs.existsSync(tocPath)) {
    try {
      const toc = JSON.parse(fs.readFileSync(tocPath, "utf-8"));
      tocLang = toc.lang;
    } catch {}
  }
  const defaultLang = (process.env.DEFAULT_LANGUAGE || "en").trim();

  const documents: SearchDoc[] = files.map((file) => {
    const doc = JSON.parse(fs.readFileSync(path.join(docDir, file), "utf-8"));
    const docLang = (doc.meta?.lang as string) || tocLang || defaultLang;
    return {
      id: file.replace(/\.json$/, ""),
      title: doc.meta?.title ?? "",
      shortdesc: doc.meta?.shortdesc ?? "",
      keywords: Array.isArray(doc.meta?.keywords)
        ? doc.meta.keywords.join(" ")
        : "",
      text: (doc.content ?? []).map(extractText).join(" "),
      lang: docLang,
    };
  });

  const miniSearch = new MiniSearch<SearchDoc>(SEARCH_INDEX_OPTIONS);
  miniSearch.addAll(documents);
  fs.writeFileSync(
    path.join(docDir, "search-index.json"),
    JSON.stringify(miniSearch),
  );
  console.log(`[${path.basename(docDir)}] search index built: ${documents.length} documents`);
}

function buildAllSearchIndices(dataDir: string): void {
  const docSets = findDocSets(dataDir);
  if (docSets.length === 0) {
    // fallback if toc.json is at root or no doc sets found
    buildSearchIndex(dataDir);
  } else {
    for (const docSet of docSets) {
      const docDir = docSet.id === "default" ? dataDir : path.join(dataDir, ...docSet.id.split("/"));
      buildSearchIndex(docDir);
    }
  }
}

if (numWorkers > 1 && cluster.isPrimary) {
  console.log(`Primary process ${process.pid} running. Building search indices once...`);
  buildAllSearchIndices(DATA_DIR);
  console.log(`Forking ${numWorkers} worker processes across CPU cores...`);
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`Worker process ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Spawning replacement...`);
    cluster.fork();
  });
} else {
  // Worker process or single-process execution
  if (!cluster.isWorker) {
    buildAllSearchIndices(DATA_DIR);
  }

  const app = express();
  app.use(cors());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, dataDir: DATA_DIR, pid: process.pid, isWorker: cluster.isWorker });
  });

  app.get("/api/docs", (_req, res) => {
    const docSets = findDocSets(DATA_DIR);
    res.json(docSets);
  });

  // backward compatibility alias
  app.get("/api/books", (_req, res) => {
    const docSets = findDocSets(DATA_DIR);
    res.json(docSets);
  });

  app.use(
    "/data",
    express.static(DATA_DIR, {
      extensions: ["json"],
      setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
    }),
  );

  app.listen(PORT, () => {
    console.log(`dita-docs backend worker ${process.pid} listening on http://localhost:${PORT}`);
    console.log(`serving ${DATA_DIR} under /data`);
  });
}


