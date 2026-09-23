# Abstract Syntax Tree RAG Service

Optional standalone vector search service for `dita-bootstrap.ast` documentation sets. It transforms DITA AST JSON topics into Markdown chunks, computes term-frequency vector embeddings, enforces data freshness using SHA-256 content hashing and `toc.json` verification, and exposes a semantic search API.

See the [top-level README](../README.md) for overall repository architecture and setup instructions.

## Features

- **AST to Markdown Conversion**: Converts DITA AST structures into clean Markdown text prior to chunking.
- **Semantic Boundary Chunking**: Splits topics along natural section and heading (`#`, `##`) boundaries rather than arbitrary token counts.
- **Vector Embedding & Search**: Computes term-frequency vectors and cosine similarity distance for semantic search queries.
- **Data Currency & Invalidation**:
  - Computes SHA-256 hashes per topic file for fast incremental indexing.
  - Verifies active topic paths against `toc.json` manifests and automatically purges vectors for deleted or renamed topics.
- **Transparent Fallback Integration**: Used optionally by `mcp-server` when `RAG_SERVICE_URL` is set, with automatic fallback to MiniSearch keyword search.

## API Routes

- `GET /health` — Returns status, resolved `DATA_DIR`, total indexed topics, and total vector chunks.
- `POST /api/search` — Accepts `{ query, docId?, lang?, topK? }` and returns ranked `SearchHit[]` results.
- `POST /api/reindex` — Triggers an on-demand scan of `DATA_DIR` and performs incremental hash re-indexing.

## Install

```console
npm install
```

## Build & Run

```console
# Development with hot reload
npm run dev

# Compile TypeScript
npm run build

# Start production server
npm run start
```

Listens on `PORT` (default `4002`) and indexes `DATA_DIR` (default `../data-store/data`).

## Environment Variables & CLI Options

- `PORT` (`-p, --port`) — Port to listen on (default `4002`).
- `DATA_DIR` (`-d, --data-dir`) — Directory containing documentation sets (default `../data-store/data`).

## CLI Usage

```console
node dist/server.js --port 4002 --data-dir ../data-store/data
```

## Docker

Build and run using the standalone Docker container:

```console
docker build -t ast-rag-service .
docker run -p 4002:4002 -v ./data-store/data:/app/data ast-rag-service
```

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
