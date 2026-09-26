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
- **`GET /api/docs/<id>`**: Returns the summary for one doc set (same shape as an `/api/docs` array entry). 404 if `<id>` doesn't exist.
- **`HEAD /api/docs/<id>`**: 200 if `<id>` exists, 404 otherwise. No body.
- **`POST /api/docs/<id>`** (body: `application/zip`): Extracts the zip into a new `<id>` folder. 201 on success, 409 if `<id>` already exists.
- **`PUT /api/docs/<id>`** (body: `application/zip`): Replaces the existing `<id>` folder's contents with the zip. 200 on success, 404 if `<id>` doesn't exist.
- **`DELETE /api/docs/<id>`**: Removes the `<id>` folder. 204 on success, 404 if it doesn't exist.
- **`GET /api/chrome`**: Returns the shared layout/nav data (`chrome.json`).
- **`PUT /api/chrome`** (body: `application/json`): Overwrites `chrome.json` with the request body. 200 on success.
- **`GET /health`**: Health check returning server status and resolved `DATA_DIR`.
- **`GET /data/...`**: Static mount for `toc.json`, topic files, and `search-index.json`.

`<id>` may contain `/` for nested doc-set groups (e.g. `group/subdoc`). Error responses for the write endpoints use [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) `application/problem+json` bodies (`type`, `title`, `status`, `detail`).

`POST`/`PUT /api/docs/<id>` bodies must be `Content-Type: application/zip` and a real zip (checked by its local-file-header magic bytes, not just the header) - 415 otherwise. `PUT /api/chrome` bodies must be `Content-Type: application/json` and parse as JSON - 415 otherwise. Bodies over `MAX_UPLOAD_SIZE` are rejected with 413 on either route.

### Authorization

`POST`/`PUT`/`DELETE /api/docs/<id>` and `PUT /api/chrome` are guarded by an optional bearer token, set via `AUTH_TOKEN`. Auth is off by default (zero-config for local dev) - if `AUTH_TOKEN` is unset, every request to these routes is allowed. If it's set, requests must send `Authorization: Bearer <AUTH_TOKEN>` or get `401` (with a `WWW-Authenticate: Bearer` header). `GET`/`HEAD`/`/data` stay open either way - this only guards writes.

```console
curl -X POST --data-binary @docset.zip \
  -H "Content-Type: application/zip" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:4000/api/docs/my-doc-set
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |
| `DEFAULT_LANGUAGE` | `"en"` | Default language code for document discovery. |
| `MAX_UPLOAD_SIZE` | `"100mb"` | Max body size accepted by `POST`/`PUT /api/docs/<id>` zip uploads. |
| `AUTH_TOKEN` | *(unset)* | Bearer token required on `/api/docs/<id>` writes. Auth is disabled when unset. |
| `CHROME_CACHE_TTL_MS` | `5000` | How long `GET /api/chrome` serves `chrome.json` from an in-memory cache before re-reading from disk. `PUT /api/chrome` invalidates the cache immediately on write. |
| `FEATURED_DOCS` | *(unset)* | Comma-separated doc-set ids to pin first (before priority/alphabetical) in `/api/docs` ordering. |
| `WEB_CONCURRENCY` / `WORKERS` | *(unset)* | Explicit worker process count. Takes precedence over `CLUSTER_MODE`. |
| `CLUSTER_MODE` | `false` | Set to `true` to run one worker per CPU core when `WEB_CONCURRENCY`/`WORKERS` aren't set. |

## Contributing

PRs accepted. Refer to the root repository contributing guidelines.

## License

[Apache-2.0](../LICENSE) © Jason Fox
