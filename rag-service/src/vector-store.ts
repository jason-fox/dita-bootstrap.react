import crypto from "node:crypto";
import type { MarkdownChunk } from "./ast-parser";

export interface SearchHit {
  id: string;
  docId: string;
  topicPath: string;
  title: string;
  shortdesc?: string;
  lang?: string;
  score: number;
  snippet?: string;
}

interface ChunkData {
  chunk: MarkdownChunk;
  hash: string;
  termFreqs: Map<string, number>;
  vector: Map<string, number>;
  norm: number;
}

export class VectorStore {
  private index = new Map<string, ChunkData[]>(); // topicPath -> ChunkData[]
  private topicHashes = new Map<string, string>(); // topicPath -> sha256 hash
  private idfMap = new Map<string, number>();
  private totalDocs = 0;

  public static hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  private computeTermFreqs(text: string): Map<string, number> {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    return tf;
  }

  public getTopicHash(topicPath: string): string | undefined {
    return this.topicHashes.get(topicPath);
  }

  public setTopicChunks(topicPath: string, hash: string, chunks: MarkdownChunk[]): void {
    const chunkDataList: ChunkData[] = chunks.map((chunk) => {
      const textToEmbed = `${chunk.title} ${chunk.shortdesc} ${chunk.sectionTitle} ${chunk.content}`;
      const termFreqs = this.computeTermFreqs(textToEmbed);
      return {
        chunk,
        hash,
        termFreqs,
        vector: new Map<string, number>(),
        norm: 0,
      };
    });

    this.index.set(topicPath, chunkDataList);
    this.topicHashes.set(topicPath, hash);
  }

  public rebuildIdfAndVectors(): void {
    const docFreq = new Map<string, number>();
    let total = 0;

    for (const chunkList of this.index.values()) {
      for (const item of chunkList) {
        total++;
        for (const term of item.termFreqs.keys()) {
          docFreq.set(term, (docFreq.get(term) || 0) + 1);
        }
      }
    }

    this.totalDocs = total;
    this.idfMap.clear();

    for (const [term, count] of docFreq.entries()) {
      this.idfMap.set(term, Math.log((total + 1) / (count + 1)) + 1);
    }

    for (const chunkList of this.index.values()) {
      for (const item of chunkList) {
        let sumSq = 0;
        const vector = new Map<string, number>();

        for (const [term, freq] of item.termFreqs.entries()) {
          const idf = this.idfMap.get(term) || Math.log(1 + total);
          const tfidf = Math.log(1 + freq) * idf;
          vector.set(term, tfidf);
          sumSq += tfidf * tfidf;
        }

        item.vector = vector;
        item.norm = Math.sqrt(sumSq);
      }
    }
  }

  public syncActiveTopics(activeTopicPaths: Set<string>): number {
    let purgedCount = 0;
    for (const topicPath of Array.from(this.index.keys())) {
      if (!activeTopicPaths.has(topicPath)) {
        this.index.delete(topicPath);
        this.topicHashes.delete(topicPath);
        purgedCount++;
      }
    }
    return purgedCount;
  }

  public search(query: string, docId?: string, lang?: string, topK: number = 10): SearchHit[] {
    const queryTf = this.computeTermFreqs(query);
    if (queryTf.size === 0 || this.index.size === 0) return [];

    let querySumSq = 0;
    const queryVec = new Map<string, number>();

    for (const [term, freq] of queryTf.entries()) {
      const idf = this.idfMap.get(term) || Math.log(1 + this.totalDocs);
      const tfidf = Math.log(1 + freq) * idf;
      queryVec.set(term, tfidf);
      querySumSq += tfidf * tfidf;
    }

    const queryNorm = Math.sqrt(querySumSq);
    if (queryNorm === 0) return [];

    const hitsByTopic = new Map<string, SearchHit>();
    const filterPrimaryLang = lang ? lang.split(/[-_]/)[0].toLowerCase() : undefined;

    for (const [topicPath, chunkList] of this.index.entries()) {
      for (const item of chunkList) {
        if (docId && item.chunk.docId !== docId && !item.chunk.docId.startsWith(`${docId}/`)) {
          continue;
        }

        if (filterPrimaryLang && item.chunk.lang) {
          const docPrimaryLang = item.chunk.lang.split(/[-_]/)[0].toLowerCase();
          if (docPrimaryLang !== filterPrimaryLang) {
            continue;
          }
        }

        let dotProduct = 0;
        for (const [term, queryWeight] of queryVec.entries()) {
          const docWeight = item.vector.get(term);
          if (docWeight) {
            dotProduct += queryWeight * docWeight;
          }
        }

        if (dotProduct === 0) continue;

        const cosineSimilarity = dotProduct / (queryNorm * (item.norm || 1));
        const score = Math.round(cosineSimilarity * 100) / 10;

        const hitId = item.chunk.docId === "default"
          ? item.chunk.topicPath
          : `${item.chunk.docId}/${item.chunk.topicPath}`;

        const existingHit = hitsByTopic.get(hitId);
        if (!existingHit || score > existingHit.score) {
          hitsByTopic.set(hitId, {
            id: hitId,
            docId: item.chunk.docId,
            topicPath: item.chunk.topicPath,
            title: item.chunk.title,
            shortdesc: item.chunk.shortdesc || undefined,
            lang: item.chunk.lang,
            snippet: item.chunk.content.slice(0, 250),
            score,
          });
        }
      }
    }

    return Array.from(hitsByTopic.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public getStats(): { totalTopics: number; totalChunks: number } {
    let totalChunks = 0;
    for (const chunkList of this.index.values()) {
      totalChunks += chunkList.length;
    }
    return {
      totalTopics: this.index.size,
      totalChunks,
    };
  }
}
