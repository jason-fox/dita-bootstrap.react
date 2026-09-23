# Abstract Syntax Tree Data Store

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

Express static file server and API serving `dita-bootstrap.ast` transtype output to web applications and search services.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Background

`data-store` serves as the primary file repository backend for the harness workspace. It scans `DATA_DIR` for generated DITA AST documentation sets (folders containing `toc.json`), generates per-set MiniSearch indices, and exposes static files and API routes consumed by `renderer`, `mcp-server`, and `rag-service`.

## Install

```console
cd data-store
npm install
```

## Usage

### Development Mode

```console
npm run dev
```

### Production Build & Serve

```console
npm run build
npm run serve
```

Listens on `PORT` (default `4000`) and serves `DATA_DIR` (default `./data`).

## API

### HTTP Endpoints

- **`GET /api/docs`**: Returns JSON array of all discovered documentation sets (`{ id, title, group, topicCount, navToc, scrollspyToc }`).
- **`GET /health`**: Health check returning server status and resolved `DATA_DIR`.
- **`GET /data/...`**: Static mount for `toc.json`, topic files, and `search-index.json`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |
| `DEFAULT_LANGUAGE` | `"en"` | Default language code for document discovery. |

## Contributing

PRs accepted. Refer to the root repository contributing guidelines.

## License

[Apache-2.0](../LICENSE) © Jason Fox
