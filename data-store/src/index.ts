import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import cluster from "node:cluster";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import MiniSearch from "minisearch";
import AdmZip from "adm-zip";

const PORT = Number(process.env.PORT ?? 4000);
// point this at a dita2ast-bootstrap output directory to serve real content
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../data");
// max body size accepted by POST/PUT /api/docs/<id> zip uploads
const MAX_UPLOAD_SIZE = process.env.MAX_UPLOAD_SIZE || "100mb";
// optional bearer token guarding the /api/docs/<id> write routes - auth is off when unset
const AUTH_TOKEN = process.env.AUTH_TOKEN || undefined;

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
  featured?: boolean;
  priority?: number;
}

interface SearchDoc {
  id: string;
  title: string;
  shortdesc: string;
  keywords: string;
  text: string;
  lang?: string;
}

// must match the MiniSearch.loadJSON() options in renderer/lib/search.ts -
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

// reads a single directory's toc.json (+ optional index.json) into a DocSetInfo,
// or null if dir isn't a doc set root - shared by findDocSets and the /api/docs/:id routes
function readDocSetInfo(dataDir: string, dir: string): DocSetInfo | null {
  const tocPath = path.join(dir, "toc.json");
  if (!fs.existsSync(tocPath)) return null;

  const relPath = path.relative(dataDir, dir).split(path.sep).join("/");
  const id = relPath === "" ? "default" : relPath;
  try {
    const toc = JSON.parse(fs.readFileSync(tocPath, "utf-8"));
    const parts = id.split("/");
    const group = parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;
    const topicCount = findTopicFiles(dir).length;

    let description: string | undefined = toc.description ?? toc.shortdesc;
    let featured: boolean | undefined = toc.featured;
    let priority: number | undefined = typeof toc.priority === "number" ? toc.priority : undefined;
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
        if (typeof indexDoc.meta?.featured === "boolean") featured = indexDoc.meta.featured;
        if (typeof indexDoc.meta?.priority === "number") priority = indexDoc.meta.priority;
      } catch (e) {
        console.error(`Error reading ${indexPath}:`, e);
      }
    }

    return {
      id,
      title: toc.title ?? id,
      description,
      group,
      navToc: toc.navToc,
      scrollspyToc: toc.scrollspyToc,
      menubar: toc.menubar,
      topicCount,
      featured,
      priority,
    };
  } catch (e) {
    console.error(`Error reading ${tocPath}:`, e);
    return null;
  }
}

// walks dataDir recursively, discovering any folder containing a toc.json file
function findDocSets(dataDir: string, dir: string = dataDir): DocSetInfo[] {
  const results: DocSetInfo[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const info = readDocSetInfo(dataDir, dir);
  if (info) results.push(info);

  for (const entry of entries) {
    if (entry.isDirectory()) {
      results.push(...findDocSets(dataDir, path.join(dir, entry.name)));
    }
  }

  if (dir !== dataDir) return results;

  // Dynamic ranking: Featured / Priority docs first, then alphabetical - mirrors mcp-server/src/provider.ts's findDocSets
  const featuredEnv = (process.env.FEATURED_DOCS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  results.sort((a, b) => {
    const isFeaturedA = a.featured || featuredEnv.includes(a.id);
    const isFeaturedB = b.featured || featuredEnv.includes(b.id);
    if (isFeaturedA !== isFeaturedB) return isFeaturedB ? 1 : -1;

    const prioA = a.priority ?? (isFeaturedA ? 100 : 0);
    const prioB = b.priority ?? (isFeaturedB ? 100 : 0);
    if (prioA !== prioB) return prioB - prioA;

    return a.title.localeCompare(b.title);
  });

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

  const documents: SearchDoc[] = [];
  for (const file of files) {
    const fullPath = path.join(docDir, file);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8").trim();
      if (!raw) continue;
      const doc = JSON.parse(raw);
      const docLang = (doc.meta?.lang as string) || tocLang || defaultLang;
      documents.push({
        id: file.replace(/\.json$/, ""),
        title: doc.meta?.title ?? "",
        shortdesc: doc.meta?.shortdesc ?? "",
        keywords: Array.isArray(doc.meta?.keywords)
          ? doc.meta.keywords.join(" ")
          : "",
        text: (doc.content ?? []).map(extractText).join(" "),
        lang: docLang,
      });
    } catch (e: any) {
      console.warn(`[${path.basename(docDir)}] Skipping unparseable topic file ${file}:`, e.message || e);
    }
  }

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

// RFC 9457 Problem Details response
function sendProblem(res: express.Response, status: number, title: string, detail: string): void {
  res.status(status).type("application/problem+json").json({ type: "about:blank", title, status, detail });
}

// resolves an /api/docs/*id wildcard param to an absolute dir under dataDir, rejecting
// path traversal (e.g. "..") so the id can't escape dataDir
function resolveDocSetDir(dataDir: string, idParts: string[]): string | null {
  const target = path.resolve(dataDir, ...idParts);
  const rel = path.relative(dataDir, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return target;
}

// checks the local file header signature "PK\x03\x04" (also accepts the empty-archive
// "PK\x05\x06" and spanned "PK\x07\x08" variants) rather than trusting the Content-Type header
function isZipBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
    (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08)
  );
}

// gates /api/docs/<id> write routes with a bearer token when AUTH_TOKEN is set; a no-op
// otherwise, so the harness stays zero-config for local dev
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!AUTH_TOKEN) {
    next();
    return;
  }
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  const tokenBuf = Buffer.from(token || "", "utf-8");
  const expectedBuf = Buffer.from(AUTH_TOKEN, "utf-8");
  const valid =
    scheme === "Bearer" &&
    tokenBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(tokenBuf, expectedBuf);
  if (!valid) {
    res.set("WWW-Authenticate", "Bearer");
    sendProblem(res, 401, "Unauthorized", "Missing or invalid Authorization: Bearer <token> header");
    return;
  }
  next();
}

// reads and parses chrome.json fresh from disk on every call (no in-memory cache), so
// a PUT /api/chrome handled by one cluster worker is immediately visible to the others
function readChromeData(dataDir: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(dataDir, "chrome.json"), "utf-8"));
}

// fails fast at startup if chrome.json is missing or invalid
function assertChromeData(dataDir: string): void {
  const chromePath = path.join(dataDir, "chrome.json");
  if (!fs.existsSync(chromePath)) {
    console.error(`[Error] Fatal: chrome.json not found at ${chromePath}`);
    process.exit(1);
  }
  try {
    readChromeData(dataDir);
  } catch (err) {
    console.error(`[Error] Fatal: Failed to read or parse ${chromePath}:`, err);
    process.exit(1);
  }
}

assertChromeData(DATA_DIR);

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

  app.get("/api/chrome", (_req, res) => {
    try {
      res.json(readChromeData(DATA_DIR));
    } catch (e: any) {
      sendProblem(res, 500, "Internal Server Error", `Failed to read chrome.json: ${e.message || e}`);
    }
  });

  app.put("/api/chrome", requireAuth, express.json({ limit: MAX_UPLOAD_SIZE }), (req, res) => {
    if (!req.is("application/json")) {
      sendProblem(res, 415, "Unsupported Media Type", "Content-Type must be application/json");
      return;
    }
    try {
      fs.writeFileSync(path.join(DATA_DIR, "chrome.json"), JSON.stringify(req.body, null, 2));
    } catch (e: any) {
      sendProblem(res, 400, "Bad Request", `Failed to write chrome.json: ${e.message || e}`);
      return;
    }
    res.status(200).json(req.body);
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

  app.head("/api/docs/*id", (req, res) => {
    const dir = resolveDocSetDir(DATA_DIR, req.params.id as string[]);
    if (!dir || !fs.existsSync(path.join(dir, "toc.json"))) {
      res.status(404).end();
      return;
    }
    res.status(200).end();
  });

  app.get("/api/docs/*id", (req, res) => {
    const idParts = req.params.id as string[];
    const id = idParts.join("/");
    const dir = resolveDocSetDir(DATA_DIR, idParts);
    const info = dir && readDocSetInfo(DATA_DIR, dir);
    if (!info) {
      sendProblem(res, 404, "Not Found", `Doc set '${id}' not found`);
      return;
    }
    res.json(info);
  });

  const zipUpload = express.raw({ type: "application/zip", limit: MAX_UPLOAD_SIZE });

  // Content-Type and magic-byte checks (415), independent of whether <id> already exists.
  // Returns the validated buffer, or sends the problem response itself and returns undefined.
  function validateZipUpload(req: express.Request, res: express.Response): Buffer | undefined {
    if (!req.is("application/zip")) {
      sendProblem(res, 415, "Unsupported Media Type", "Content-Type must be application/zip");
      return undefined;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      sendProblem(res, 400, "Bad Request", "Request body must be a non-empty zip payload");
      return undefined;
    }
    if (!isZipBuffer(req.body)) {
      sendProblem(res, 415, "Unsupported Media Type", "Request body is not a valid zip archive");
      return undefined;
    }
    return req.body;
  }

  // extracts buf into dir, replacing any existing contents
  function extractZipUpload(buf: Buffer, dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    new AdmZip(buf).extractAllTo(dir, true);
    buildSearchIndex(dir);
  }

  app.post("/api/docs/*id", requireAuth, zipUpload, (req, res) => {
    const idParts = req.params.id as string[];
    const id = idParts.join("/");
    const dir = resolveDocSetDir(DATA_DIR, idParts);
    if (!dir) {
      sendProblem(res, 400, "Bad Request", `Invalid doc set id '${id}'`);
      return;
    }
    const buf = validateZipUpload(req, res);
    if (!buf) return;
    if (fs.existsSync(path.join(dir, "toc.json"))) {
      sendProblem(res, 409, "Conflict", `Doc set '${id}' already exists`);
      return;
    }
    try {
      extractZipUpload(buf, dir);
    } catch (e: any) {
      sendProblem(res, 400, "Bad Request", `Failed to extract zip: ${e.message || e}`);
      return;
    }
    res.status(201).location(`/api/docs/${id}`).json(readDocSetInfo(DATA_DIR, dir));
  });

  app.put("/api/docs/*id", requireAuth, zipUpload, (req, res) => {
    const idParts = req.params.id as string[];
    const id = idParts.join("/");
    const dir = resolveDocSetDir(DATA_DIR, idParts);
    if (!dir) {
      sendProblem(res, 400, "Bad Request", `Invalid doc set id '${id}'`);
      return;
    }
    const buf = validateZipUpload(req, res);
    if (!buf) return;
    if (!fs.existsSync(path.join(dir, "toc.json"))) {
      sendProblem(res, 404, "Not Found", `Doc set '${id}' not found`);
      return;
    }
    try {
      extractZipUpload(buf, dir);
    } catch (e: any) {
      sendProblem(res, 400, "Bad Request", `Failed to extract zip: ${e.message || e}`);
      return;
    }
    res.status(200).json(readDocSetInfo(DATA_DIR, dir));
  });

  app.delete("/api/docs/*id", requireAuth, (req, res) => {
    const idParts = req.params.id as string[];
    const id = idParts.join("/");
    const dir = resolveDocSetDir(DATA_DIR, idParts);
    if (!dir || !fs.existsSync(path.join(dir, "toc.json"))) {
      sendProblem(res, 404, "Not Found", `Doc set '${id}' not found`);
      return;
    }
    fs.rmSync(dir, { recursive: true, force: true });
    res.status(204).end();
  });

  app.use(
    "/data",
    express.static(DATA_DIR, {
      extensions: ["json"],
      setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
    }),
  );

  // express.raw/express.json body parsing errors reach here before the route handler -
  // translate them into Problem Details responses instead of Express's default HTML error page
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.type === "entity.too.large") {
      sendProblem(res, 413, "Payload Too Large", `Request body exceeds the ${MAX_UPLOAD_SIZE} limit`);
      return;
    }
    if (err?.type === "entity.parse.failed") {
      sendProblem(res, 415, "Unsupported Media Type", "Request body is not valid JSON");
      return;
    }
    next(err);
  });

  app.listen(PORT, () => {
    console.log(`AST data-store worker ${process.pid} listening on http://localhost:${PORT}`);
    console.log(`serving ${DATA_DIR} under /data`);
  });
}


