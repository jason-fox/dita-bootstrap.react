import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { MarkdownChunk } from "./ast-parser";

export interface SearchHit {
  id: string;
  docId: string;
  topicPath: string;
  title: string;
  shortdesc?: string;
  lang?: string;
  sectionTitle?: string;
  anchor?: string;
  score: number;
  snippet?: string;
}

export interface EmbeddedChunk {
  chunk: MarkdownChunk;
  vector: Float32Array;
}

interface ChunkData extends EmbeddedChunk {
  terms: Map<string, number>;
  length: number;
}

interface CacheFile {
  version: number;
  model: string;
  topics: Record<string, { hash: string; chunks: { chunk: MarkdownChunk; vector: string }[] }>;
}

const CACHE_VERSION = 1;
const RRF_K = 60;
const CANDIDATES = 50;
const BM25_K1 = 1.2;
const BM25_B = 0.75;

export class VectorStore {
  private index = new Map<string, ChunkData[]>();
  private topicHashes = new Map<string, string>();
  private docFreq = new Map<string, number>();
  private totalChunks = 0;
  private avgLength = 0;

  public static hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  public static tokenize(text: string): string[] {
    const tokens: string[] = [];
    const words = text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]*/gu) ?? [];
    for (const word of words) {
      if (word.length > 1) tokens.push(word);
      if (/[_-]/.test(word)) {
        for (const part of word.split(/[_-]+/)) {
          if (part.length > 1) tokens.push(part);
        }
      }
    }
    return tokens;
  }

  public getTopicHash(topicPath: string): string | undefined {
    return this.topicHashes.get(topicPath);
  }

  public setTopicChunks(topicPath: string, hash: string, chunks: EmbeddedChunk[]): void {
    const data = chunks.map(({ chunk, vector }) => {
      const tokens = VectorStore.tokenize(
        `${chunk.title} ${chunk.shortdesc} ${chunk.sectionTitle} ${chunk.content}`
      );
      const terms = new Map<string, number>();
      for (const token of tokens) terms.set(token, (terms.get(token) || 0) + 1);
      return { chunk, vector, terms, length: tokens.length };
    });
    this.index.set(topicPath, data);
    this.topicHashes.set(topicPath, hash);
  }

  public syncActiveTopics(activeTopicPaths: Set<string>): number {
    let purged = 0;
    for (const topicPath of Array.from(this.index.keys())) {
      if (!activeTopicPaths.has(topicPath)) {
        this.index.delete(topicPath);
        this.topicHashes.delete(topicPath);
        purged++;
      }
    }
    return purged;
  }

  public rebuildLexicalStats(): void {
    this.docFreq.clear();
    let total = 0;
    let lengthSum = 0;
    for (const list of this.index.values()) {
      for (const item of list) {
        total++;
        lengthSum += item.length;
        for (const term of item.terms.keys()) {
          this.docFreq.set(term, (this.docFreq.get(term) || 0) + 1);
        }
      }
    }
    this.totalChunks = total;
    this.avgLength = total > 0 ? lengthSum / total : 0;
  }

  private matches(item: ChunkData, docId?: string, primaryLang?: string): boolean {
    const chunkDocId = item.chunk.docId;
    if (docId && chunkDocId !== docId && !chunkDocId.startsWith(`${docId}/`)) return false;
    if (primaryLang && item.chunk.lang) {
      if (item.chunk.lang.split(/[-_]/)[0].toLowerCase() !== primaryLang) return false;
    }
    return true;
  }

  private bm25(item: ChunkData, queryTerms: string[]): number {
    let score = 0;
    for (const term of queryTerms) {
      const tf = item.terms.get(term);
      if (!tf) continue;
      const df = this.docFreq.get(term) || 0;
      const idf = Math.log(1 + (this.totalChunks - df + 0.5) / (df + 0.5));
      const norm = tf + BM25_K1 * (1 - BM25_B + BM25_B * (item.length / (this.avgLength || 1)));
      score += idf * ((tf * (BM25_K1 + 1)) / norm);
    }
    return score;
  }

  public search(
    query: string,
    queryVector: Float32Array,
    docId?: string,
    lang?: string,
    topK: number = 10
  ): SearchHit[] {
    if (this.index.size === 0) return [];

    const primaryLang = lang ? lang.split(/[-_]/)[0].toLowerCase() : undefined;
    const queryTerms = Array.from(new Set(VectorStore.tokenize(query)));

    const dense: { item: ChunkData; score: number }[] = [];
    const lexical: { item: ChunkData; score: number }[] = [];

    for (const list of this.index.values()) {
      for (const item of list) {
        if (!this.matches(item, docId, primaryLang)) continue;

        let dot = 0;
        for (let i = 0; i < queryVector.length; i++) dot += queryVector[i] * item.vector[i];
        dense.push({ item, score: dot });

        const lex = this.bm25(item, queryTerms);
        if (lex > 0) lexical.push({ item, score: lex });
      }
    }

    const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;
    dense.sort(byScore);
    lexical.sort(byScore);

    const fused = new Map<ChunkData, number>();
    for (const ranking of [dense, lexical]) {
      ranking.slice(0, CANDIDATES).forEach(({ item }, rank) => {
        fused.set(item, (fused.get(item) || 0) + 1 / (RRF_K + rank + 1));
      });
    }

    const maxRrf = 2 / (RRF_K + 1);
    const hitsByTopic = new Map<string, SearchHit>();

    for (const [item, rrf] of fused.entries()) {
      const { chunk } = item;
      const hitId = chunk.docId === "default" ? chunk.topicPath : `${chunk.docId}/${chunk.topicPath}`;
      const score = Math.round((rrf / maxRrf) * 100) / 10;
      const existing = hitsByTopic.get(hitId);
      if (existing && existing.score >= score) continue;
      hitsByTopic.set(hitId, {
        id: hitId,
        docId: chunk.docId,
        topicPath: chunk.topicPath,
        title: chunk.title,
        shortdesc: chunk.shortdesc || undefined,
        lang: chunk.lang,
        sectionTitle: chunk.sectionTitle !== chunk.title ? chunk.sectionTitle : undefined,
        anchor: chunk.anchor,
        snippet: chunk.content.slice(0, 250),
        score,
      });
    }

    return Array.from(hitsByTopic.values()).sort(byScore).slice(0, topK);
  }

  public getStats(): { totalTopics: number; totalChunks: number } {
    let totalChunks = 0;
    for (const list of this.index.values()) totalChunks += list.length;
    return { totalTopics: this.index.size, totalChunks };
  }

  public load(cachePath: string, modelId: string): void {
    if (!fs.existsSync(cachePath)) return;
    try {
      const file = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as CacheFile;
      if (file.version !== CACHE_VERSION || file.model !== modelId) return;
      for (const [topicPath, entry] of Object.entries(file.topics)) {
        const chunks = entry.chunks.map(({ chunk, vector }) => {
          const buf = Buffer.from(vector, "base64");
          const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
          return { chunk, vector: Float32Array.from(floats) };
        });
        this.setTopicChunks(topicPath, entry.hash, chunks);
      }
    } catch (err) {
      console.warn(`[rag-service] Ignoring unreadable cache at ${cachePath}:`, err);
    }
  }

  public save(cachePath: string, modelId: string): void {
    const topics: CacheFile["topics"] = {};
    for (const [topicPath, list] of this.index.entries()) {
      topics[topicPath] = {
        hash: this.topicHashes.get(topicPath) || "",
        chunks: list.map(({ chunk, vector }) => ({
          chunk,
          vector: Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString("base64"),
        })),
      };
    }
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const tmp = `${cachePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ version: CACHE_VERSION, model: modelId, topics } satisfies CacheFile));
    fs.renameSync(tmp, cachePath);
  }
}
