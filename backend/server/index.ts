import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import MiniSearch from "minisearch";

const PORT = Number(process.env.PORT ?? 4000);
// point this at a dita2ast-bootstrap output directory to serve real content
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../data");

interface SearchDoc {
  id: string;
  title: string;
  shortdesc: string;
  keywords: string;
  text: string;
}

// must match the MiniSearch.loadJSON() options in frontend/lib/search.ts -
// the serialized index only carries term data, not this config
const SEARCH_INDEX_OPTIONS = {
  fields: ["title", "shortdesc", "keywords", "text"],
  storeFields: ["title", "shortdesc"],
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

// walks dataDir recursively, returning topic JSON paths relative to dataDir (POSIX
// separators, so ids match the /view/<id> route regardless of host OS)
function findTopicFiles(dataDir: string, dir: string = dataDir): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTopicFiles(dataDir, fullPath));
    } else if (
      entry.name.endsWith(".json") &&
      entry.name !== "toc.json" &&
      entry.name !== "search-index.json"
    ) {
      results.push(path.relative(dataDir, fullPath).split(path.sep).join("/"));
    }
  }
  return results;
}

// builds a MiniSearch index from every topic JSON in dataDir (recursively) and writes
// it as search-index.json, served automatically by the /data static mount below
function buildSearchIndex(dataDir: string): void {
  if (!fs.existsSync(dataDir)) return;
  const files = findTopicFiles(dataDir);
  if (files.length === 0) {
    console.log(
      `no topic JSON found in ${dataDir} yet - skipping search index build`,
    );
    return;
  }

  const documents: SearchDoc[] = files.map((file) => {
    const doc = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
    return {
      id: file.replace(/\.json$/, ""),
      title: doc.meta?.title ?? "",
      shortdesc: doc.meta?.shortdesc ?? "",
      keywords: Array.isArray(doc.meta?.keywords)
        ? doc.meta.keywords.join(" ")
        : "",
      text: (doc.content ?? []).map(extractText).join(" "),
    };
  });

  const miniSearch = new MiniSearch<SearchDoc>(SEARCH_INDEX_OPTIONS);
  miniSearch.addAll(documents);
  fs.writeFileSync(
    path.join(dataDir, "search-index.json"),
    JSON.stringify(miniSearch),
  );
  console.log(`search index built: ${documents.length} documents`);
}

const app = express();
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true, dataDir: DATA_DIR });
});

app.use(
  "/data",
  express.static(DATA_DIR, {
    extensions: ["json"],
    setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
  }),
);

buildSearchIndex(DATA_DIR);

app.listen(PORT, () => {
  console.log(`dbjson-harness backend listening on http://localhost:${PORT}`);
  console.log(`serving ${DATA_DIR} under /data`);
});
