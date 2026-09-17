# DITA Bootstrap AST Harness

A two-part harness for viewing `dita-bootstrap.ast` transtype output in a real React app.
The harness supports discovering and displaying multiple AST documentation sets (books, guides, or document sets) stored in subdirectories under the backend's data folder.

- **`backend/`** — Express static file server and API. Serves JSON AST files produced by the `org.dita-bootstrap.ast` DITA-OT plugin, scans for documentation sets recursively (`toc.json`), and builds per-set MiniSearch indices.
- **`frontend/`** — Next.js + react-bootstrap app that fetches doc set metadata, presents a card grid library landing page, and recursively renders JSON AST topics into real `react-bootstrap` components with collapsible TOC sidebars and dark mode support.

## Prerequisites

Generate JSON output with a DITA-OT toolkit that has the `org.dita-bootstrap.ast` plug-in installed, using the `ast-bootstrap` transtype:

```console
dita --input=path/to/your.ditamap \
     --format=ast-bootstrap \
     --output=path/to/output
```

Then sync the generated output folder into a subdirectory under `backend/data/`:

```console
rsync -a --delete path/to/output/ backend/data/my-doc-set/
```

Any subdirectory in `backend/data/` containing a `toc.json` file will automatically be discovered as a documentation set.

## Running

```console
# backend (port 4000)
cd backend
npm install
npm run dev

# frontend (port 3100, to avoid colliding with local apps on 3000)
cd frontend
npm install
npm run dev -- -p 3100
```

Open http://localhost:3100 — the landing page displays a grid of all discovered documentation sets with "Browse" links. Clicking a set opens its documentation view at `/view/<docId>`.

## Search

The backend builds a [MiniSearch](https://github.com/lucaong/minisearch) full-text index for each documentation set at startup (`buildAllSearchIndices()` in `backend/server/index.ts`). It scans every topic JSON in each doc set folder and flattens its AST `content` to plain text, plus `meta.title`/`shortdesc`/`keywords`. The index is written as `search-index.json` into each doc set directory (e.g. `data/my-doc-set/search-index.json`) and served via `/data`.

When viewing a specific doc set, the search box appears in the header and queries that set's MiniSearch index client-side (`frontend/lib/search.ts`, `frontend/components/Search.tsx`). Restart the backend after syncing new or updated documentation sets to rebuild the search indices.

## Environment Variables

### Frontend (`frontend/`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_DOCS_TITLE` / `DOCS_TITLE` | `"Documentation"` | Custom site title displayed in navbar branding and layout header. |
| `NEXT_PUBLIC_DOCS_DESCRIPTION` / `DOCS_DESCRIPTION` | `"Documentation"` | Site description used in HTML metadata tags. |
| `NEXT_PUBLIC_DATA_URL` | `http://localhost:4000/data` | Base URL used to fetch `toc.json`, topic files, and search indices. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Base URL for backend API endpoints like `GET /api/docs`. |

### Backend (`backend/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |

## License

Apache 2.0 — see `frontend/LICENSE` and `backend/LICENSE`.
