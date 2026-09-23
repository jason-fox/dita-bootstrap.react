# Abstract Syntax Tree RAG Service

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

Optional standalone vector search service for `dita-bootstrap.ast` documentation sets.

It transforms DITA AST JSON topics into Markdown chunks, computes term-frequency vector embeddings, enforces data freshness using SHA-256 content hashing and `toc.json` verification, and exposes a semantic vector search API.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [License](#license)

## Background

Large documentation sets benefit from vector search prior to LLM selection. Raw DITA AST JSON files contain wrapper props and tag metadata that dilute semantic vector distance calculations.

`rag-service` solves this by converting AST tuples to Markdown, chunking along semantic heading boundaries (`#`, `##`), and serving vector similarity search results. It maintains data currency by calculating SHA-256 hashes per topic and purging deleted topics against active `toc.json` manifests.

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
docker run -p 4002:4002 -v ./data-store/data:/app/data ast-rag-service
```

## API

### HTTP Endpoints

- **`GET /health`**: Returns system status, resolved `DATA_DIR`, total indexed topics, and total vector chunks.
- **`POST /api/search`**: Accepts `{ query: string, docId?: string, lang?: string, topK?: number }` payload and returns ranked `SearchHit[]` objects.
- **`POST /api/reindex`**: Triggers an on-demand scan of `DATA_DIR` and performs incremental hash re-indexing.

### Environment Variables & Parameters

| Parameter | Environment Variable | Default | Description |
|---|---|---|---|
| `-p, --port` | `PORT` | `4002` | Port for the Express server to listen on. |
| `-d, --data-dir` | `DATA_DIR` | `../data-store/data` | Path to data directory containing documentation sets. |

## License

[Apache-2.0](../LICENSE) © Jason Fox
