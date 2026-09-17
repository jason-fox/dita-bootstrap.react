# DITA Bootstrap AST File Server

Express static file server that serves `dita-bootstrap.ast` transtype output (per-topic JSON
files plus `toc.json`) to the `frontend/` app under `/data`. Also includes a built-in search function.

See the [top-level README](../README.md) for how to generate that output from the DITA-OT
toolkit and sync it into `data/`.

## Install

```console
npm install
```

## Run

```console
npm run dev
```

Listens on `PORT` (default `4000`) and serves `DATA_DIR` (default `./data`) under `/data`.

## Environment

- `PORT` - port to listen on (default `4000`)
- `DATA_DIR` - directory to serve under `/data` (default `./data`)

## Scripts

- `npm run dev` - start with file-watching (`tsx watch`)
- `npm run start` - run once without watching
- `npm run build` - compile TypeScript to `dist/`
- `npm run serve` - run the compiled `dist/index.js`

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
