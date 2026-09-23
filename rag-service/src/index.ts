import path from "node:path";
import express from "express";
import cors from "cors";
import { Command } from "commander";
import { z } from "zod";
import { VectorStore } from "./vector-store";
import { Indexer } from "./indexer";

const program = new Command();

program
  .name("ast-rag-service")
  .description("Optional standalone RAG vector search service for AST DITA documentation")
  .option("-p, --port <number>", "Port to run HTTP server on", process.env.PORT || "4002")
  .option("-d, --data-dir <path>", "Path to data-store data directory", process.env.DATA_DIR || path.resolve(__dirname, "../../data-store/data"));

program.parse(process.argv);
const options = program.opts();

const port = Number.parseInt(options.port, 10);
const dataDir = path.resolve(options.dataDir);

const vectorStore = new VectorStore();
const indexer = new Indexer(dataDir, vectorStore);

console.log(`[rag-service] Initializing RAG vector store for data directory: ${dataDir}`);
const initialResult = indexer.indexAll();
console.log(
  `[rag-service] Initial index complete. Indexed: ${initialResult.indexed}, Skipped: ${initialResult.skipped}, Purged: ${initialResult.purged}`
);

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
    status: "ok",
    dataDir,
    totalTopics: stats.totalTopics,
    totalChunks: stats.totalChunks,
  });
});

app.post("/api/search", (req, res) => {
  const parse = searchSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.format() });
  }

  const { query, docId, lang, topK } = parse.data;
  const hits = vectorStore.search(query, docId, lang, topK);
  return res.json(hits);
});

app.post("/api/reindex", (_req, res) => {
  const result = indexer.indexAll();
  const stats = vectorStore.getStats();
  return res.json({
    status: "ok",
    ...result,
    ...stats,
  });
});

app.listen(port, () => {
  console.log(`[rag-service] Server running on http://localhost:${port}`);
});
