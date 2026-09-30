# Abstract Syntax Tree RAG Service

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

Optional standalone vector search service for `dita-bootstrap.ast` documentation sets.

It transforms DITA AST JSON topics into Markdown chunks, embeds them with a local Hugging Face model, ranks results by fusing embedding similarity with BM25, enforces data freshness using SHA-256 content hashing and `toc.json` verification, and exposes a hybrid semantic search API.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [License](#license)

## Background

Large documentation sets benefit from vector search prior to LLM selection. Raw DITA AST JSON files contain wrapper props and tag metadata that dilute semantic vector distance calculations.

`rag-service` solves this by converting AST tuples to Markdown, chunking along heading boundaries (`#` to `###`, capped at roughly 450 tokens, tiny sections merged), and serving hybrid search results. Embeddings understand paraphrases and cross-language queries; BM25 keeps exact identifiers such as `RAG_SERVICE_URL` findable. It maintains data currency by calculating SHA-256 hashes per topic and purging deleted topics against active `toc.json` manifests.

## Install

```console
cd rag-service
npm install
```

## Usage

### Development Mode

```console
npm run dev
```

### Production Build & Startup

```console
npm run build
npm run start
```

### CLI Command

```console
node dist/index.js --port 4002 --data-dir ../data-store/data
```

### Docker

```console
docker build -t ast-rag-service .
docker run -p 4002:4002 -v ./data-store/data:/app/data -v rag-cache:/app/cache ast-rag-service
```

The embedding model is chosen at build time and baked into the image:

```console
docker build --build-arg EMBED_MODEL=bge-base-en-v1.5 -t ast-rag-service:en .
```

Available models (`src/models.ts`):

| Model | Languages | Notes |
|---|---|---|
| `bge-m3` (default) | Multilingual, incl. Finnish, German, French | Best quality, slowest indexing. Supports cross-language queries. |
| `multilingual-e5-base` / `multilingual-e5-small` | Multilingual | Lighter alternatives. |
| `bge-base-en-v1.5` / `bge-small-en-v1.5` | English only | Faster; use when all docs are English. |

Embeddings are cached in `CACHE_DIR`, keyed by model and precision, so a restart only re-embeds changed topics. Changing the model starts a fresh cache.

## API

### HTTP Endpoints

- **`GET /health`**: Returns `status` (`indexing` until the first pass completes, then `ok`), the active model, resolved `DATA_DIR`, and topic and chunk counts.
- **`POST /api/search`**: Accepts `{ query: string, docId?: string, lang?: string, topK?: number }` payload and returns ranked `SearchHit[]` objects, including `sectionTitle` and `anchor` of the best matching chunk. Responds `503` while the initial index is building, which makes `mcp-server` fall back to MiniSearch.
- **`POST /api/reindex`**: Triggers an on-demand scan of `DATA_DIR` and performs incremental hash re-indexing.

### Environment Variables & Parameters

| Parameter | Environment Variable | Default | Description |
|---|---|---|---|
| `-p, --port` | `PORT` | `4002` | Port for the Express server to listen on. |
| `-d, --data-dir` | `DATA_DIR` | `../data-store/data` | Path to data directory containing documentation sets. |
| `-m, --model` | `EMBED_MODEL` | `bge-m3` | Embedding model name. In Docker it is fixed at build time. |
| `--dtype` | `EMBED_DTYPE` | `q8` | Model weight precision (`q8`, `fp16`, `fp32`, `q4`). |
| `--cache-dir` | `CACHE_DIR` | `~/.cache/ast-rag-service` | Where embeddings are persisted. |
| `--model-dir` | `MODEL_DIR` | `<cache-dir>/models` | Where model weights are downloaded. |
| | `HF_OFFLINE` | *(unset)* | Set to `true` to forbid model downloads at runtime. |

## License

[Apache-2.0](../LICENSE) © Jason Fox
