# react-harness

A two-part harness for viewing `dita-bootstrap.ast` transtype output in a real React app.

- **`backend/`** — Express static file server, serves the JSON AST files produced by the `org.dita-bootstrap.ast` DITA-OT plugin.
- **`frontend/`** — Next.js + react-bootstrap app that fetches a topic's JSON AST and recursively renders it into real `react-bootstrap` components, with a collapsible TOC sidebar and a swappable header.

## Prerequisites

Generate JSON output with a DITA-OT toolkit that has the `org.dita-bootstrap.ast` plug-in installed, using the `bootstrap-ast` transtype:

```console
dita --input=path/to/your.ditamap \
     --format=bootstrap-ast \
     --output=path/to/output
```

Then sync it into the backend's data directory:

```console
rsync -a --delete path/to/output/ backend/data/
```

## Running

```console
# backend (port 4000)
cd backend
npm install
npm run dev

# frontend (port 3100, to avoid a colliding local app on 3000)
cd frontend
npm install
npm run dev -- -p 3100
```

Open http://localhost:3100 — it redirects to the first TOC entry.

## Environment

`NEXT_PUBLIC_DATA_URL` is the base URL the frontend uses to reach the backend's `/data` mount -
it fetches `toc.json` and each `<topic>.json` from `${NEXT_PUBLIC_DATA_URL}/<file>`, and also
resolves image `src` attributes against it. It's prefixed `NEXT_PUBLIC_` (rather than a plain
server-side env var) because image resolution happens in the browser, not just on the Next.js
server - so the value must be reachable from wherever the user's browser is, not just from the
frontend process itself.

It defaults to `http://localhost:4000/data`, matching the backend's default `PORT` below, so no
`frontend/.env.local` is needed for local dev. Only add one if you change the backend's `PORT`,
or run the two apps on different hosts:

```
NEXT_PUBLIC_DATA_URL=http://your-backend-host:PORT/data
```

`backend` reads `PORT` (default 4000) and `DATA_DIR` (default `./data`).

## License

Apache 2.0 — see `frontend/LICENSE` and `backend/LICENSE`.
