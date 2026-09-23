import fs from "node:fs";
import path from "node:path";
import { AstParser } from "./ast-parser";
import { VectorStore } from "./vector-store";

interface DocSetInfo {
  id: string;
  dir: string;
}

export class Indexer {
  constructor(
    private dataDir: string,
    private vectorStore: VectorStore
  ) {}

  public findDocSets(): DocSetInfo[] {
    const results: DocSetInfo[] = [];

    if (fs.existsSync(path.join(this.dataDir, "toc.json"))) {
      results.push({ id: "default", dir: this.dataDir });
    }

    const scanSubdirs = (currentDir: string, prefix: string = "") => {
      if (!fs.existsSync(currentDir)) return;
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(currentDir, entry.name);
        const relativeId = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (fs.existsSync(path.join(fullPath, "toc.json"))) {
          results.push({ id: relativeId, dir: fullPath });
        } else {
          scanSubdirs(fullPath, relativeId);
        }
      }
    };

    scanSubdirs(this.dataDir);
    return results;
  }

  private extractTopicHrefs(node: unknown): string[] {
    const hrefs: string[] = [];
    if (!node) return hrefs;

    if (typeof node === "object" && node !== null) {
      if (!Array.isArray(node)) {
        for (const [key, val] of Object.entries(node)) {
          if (key === "href" && typeof val === "string") {
            hrefs.push(val);
          } else {
            hrefs.push(...this.extractTopicHrefs(val));
          }
        }
      } else {
        for (const item of node) {
          hrefs.push(...this.extractTopicHrefs(item));
        }
      }
    }

    return hrefs;
  }

  public indexAll(): { indexed: number; purged: number; skipped: number } {
    const docSets = this.findDocSets();
    const activeTopicPaths = new Set<string>();

    let indexedCount = 0;
    let skippedCount = 0;

    for (const docSet of docSets) {
      const tocPath = path.join(docSet.dir, "toc.json");
      if (!fs.existsSync(tocPath)) continue;

      try {
        const tocContent = fs.readFileSync(tocPath, "utf-8");
        const toc = JSON.parse(tocContent);
        const fallbackLang = (toc.lang as string) || undefined;
        const hrefs = Array.from(new Set(this.extractTopicHrefs(toc)));

        for (const rawHref of hrefs) {
          const cleanTopic = rawHref.endsWith(".json") ? rawHref.slice(0, -5) : rawHref;
          const relativeTopicKey = docSet.id === "default" ? cleanTopic : `${docSet.id}/${cleanTopic}`;
          activeTopicPaths.add(relativeTopicKey);

          const topicFilePath = path.join(docSet.dir, `${cleanTopic}.json`);
          if (!fs.existsSync(topicFilePath)) continue;

          const rawFile = fs.readFileSync(topicFilePath, "utf-8");
          const fileHash = VectorStore.hashContent(rawFile);
          const existingHash = this.vectorStore.getTopicHash(relativeTopicKey);

          if (existingHash === fileHash) {
            skippedCount++;
            continue;
          }

          const topicDoc = JSON.parse(rawFile);
          const title = (topicDoc.meta?.title as string) || cleanTopic;
          const shortdesc = (topicDoc.meta?.shortdesc as string) || "";
          const lang = (topicDoc.meta?.lang as string) || fallbackLang;
          const markdown = AstParser.astToMarkdown(topicDoc.content);

          const chunks = AstParser.chunkMarkdown(
            markdown,
            docSet.id,
            cleanTopic,
            title,
            shortdesc,
            lang
          );

          this.vectorStore.setTopicChunks(relativeTopicKey, fileHash, chunks);
          indexedCount++;
        }
      } catch (err) {
        console.error(`[rag-service] Failed to index doc set '${docSet.id}':`, err);
      }
    }

    const purgedCount = this.vectorStore.syncActiveTopics(activeTopicPaths);

    if (indexedCount > 0 || purgedCount > 0) {
      this.vectorStore.rebuildIdfAndVectors();
    }

    return { indexed: indexedCount, purged: purgedCount, skipped: skippedCount };
  }
}
