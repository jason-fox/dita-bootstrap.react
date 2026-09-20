# Abstract Syntax Tree Data Store

Express static file server and API that serves `dita-bootstrap.ast` transtype output (one file per topic JSON files plus a `toc.json`) to the `renderer/` app.

See the [top-level README](../README.md) for how to generate AST output from the DITA-OT toolkit and sync it into `data/`.

## Features

- **Documentation Set Discovery**: Recursively scans `DATA_DIR` for folders containing `toc.json` and exposes `GET /api/docs`.
- **Search Indexing**: Generates a MiniSearch `search-index.json` file inside each doc set folder on server startup.
- **Static File Serving**: Serves all topic and AST assets under `/data`.

## API Routes

- `GET /api/docs` — returns JSON array of all discovered documentation sets (`{ id, title, group, topicCount, navToc, scrollspyToc }`).
- `GET /health` — health check returning server status and resolved `DATA_DIR`.
- `GET /data/...` — static mount for `toc.json`, topic files, and `search-index.json`.

## Install

```console
npm install
```

## Run

```console
npm run dev
```

Listens on `PORT` (default `4000`) and serves `DATA_DIR` (default `./data`).

## Environment Variables

- `PORT` - Port to listen on (default `4000`)
- `DATA_DIR` - Directory containing documentation sets (default `./data`)

## Scripts

- `npm run dev` - Start with file-watching (`tsx watch`)
- `npm run start` - Run once without watching
- `npm run build` - Compile TypeScript to `dist/`
- `npm run serve` - Run the compiled `dist/index.js`

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
