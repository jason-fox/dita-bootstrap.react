import path from "node:path";
import os from "node:os";
import express from "express";
import cors from "cors";
import { Command } from "commander";
import { z } from "zod";
import { VectorStore } from "./vector-store";
import { Indexer } from "./indexer";
import { Embedder } from "./embedder";
import { DEFAULT_MODEL } from "./models";

const program = new Command();

program
  .name("ast-rag-service")
  .description("Optional standalone RAG vector search service for AST DITA documentation")
  .option("-p, --port <number>", "Port to run HTTP server on", process.env.PORT || "4002")
  .option(
    "-d, --data-dir <path>",
    "Path to data-store data directory",
    process.env.DATA_DIR || path.resolve(__dirname, "../../data-store/data"),
  )
  .option("-m, --model <name>", "Embedding model (see src/models.ts)", process.env.EMBED_MODEL || DEFAULT_MODEL)
  .option("--dtype <dtype>", "Model weight precision (q8, fp32, fp16, q4)", process.env.EMBED_DTYPE || "q8")
  .option(
    "--cache-dir <path>",
    "Directory for persisted embeddings",
    process.env.CACHE_DIR || path.join(os.homedir(), ".cache", "ast-rag-service"),
  )
  .option("--model-dir <path>", "Directory holding downloaded model weights", process.env.MODEL_DIR);

program.parse(process.argv);
const options = program.opts();

const port = Number.parseInt(options.port, 10);
const dataDir = path.resolve(options.dataDir);

const embedder = new Embedder(options.model, options.dtype, options.modelDir || path.join(options.cacheDir, "models"));
const cachePath = path.join(options.cacheDir, `embeddings-${options.model}-${options.dtype}.json`);
const vectorStore = new VectorStore();
const indexer = new Indexer(dataDir, vectorStore, embedder, cachePath);

let ready = false;
let indexing: Promise<unknown> = Promise.resolve();

const reindex = () => {
  const run = indexing.then(() => indexer.indexAll());
  indexing = run.catch(() => undefined);
  return run;
};

const app = express();
app.use(cors());
app.use(express.json());

const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  docId: z.string().optional(),
  lang: z.string().optional(),
  topK: z.number().optional().default(10),
});

app.get("/health", (_req, res) => {
  const stats = vectorStore.getStats();
  res.json({
    status: ready ? "ok" : "indexing",
    model: embedder.id,
    dataDir,
    totalTopics: stats.totalTopics,
    totalChunks: stats.totalChunks,
  });
});

app.post("/api/search", async (req, res) => {
  if (!ready) return res.status(503).json({ error: "Index is still building" });

  const parse = searchSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.format() });
  }

  const { query, docId, lang, topK } = parse.data;
  try {
    const queryVector = await embedder.embedQuery(query);
    return res.json(vectorStore.search(query, queryVector, docId, lang, topK));
  } catch (err) {
    console.error("[rag-service] Search failed:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

app.post("/api/reindex", async (_req, res) => {
  try {
    const result = await reindex();
    return res.json({ status: "ok", ...result, ...vectorStore.getStats() });
  } catch (err) {
    console.error("[rag-service] Reindex failed:", err);
    return res.status(500).json({ error: "Reindex failed" });
  }
});

app.listen(port, () => {
  console.log(`[rag-service] Server running on http://localhost:${port}`);
  console.log(`[rag-service] Loading ${embedder.id} and indexing ${dataDir}`);
  reindex()
    .then((result) => {
      ready = true;
      console.log(
        `[rag-service] Initial index complete. Indexed: ${result.indexed}, Skipped: ${result.skipped}, Purged: ${result.purged}`,
      );
    })
    .catch((err) => {
      console.error("[rag-service] Initial index failed:", err);
      process.exit(1);
    });
});
