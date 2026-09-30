import os from "node:os";
import path from "node:path";
import { Embedder } from "./embedder";
import { DEFAULT_MODEL } from "./models";

const cacheDir = process.env.CACHE_DIR || path.join(os.homedir(), ".cache", "ast-rag-service");
const embedder = new Embedder(process.env.EMBED_MODEL || DEFAULT_MODEL, process.env.EMBED_DTYPE || "q8", process.env.MODEL_DIR || path.join(cacheDir, "models"));

embedder.load().then(() => console.log(`[rag-service] Prefetched ${embedder.id}`));
