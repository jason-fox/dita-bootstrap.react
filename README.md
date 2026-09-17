# DITA Bootstrap AST Harness & MCP Server

A harness and Model Context Protocol (MCP) server for viewing and querying `dita-bootstrap.ast` transtype output.
The workspace supports discovering and displaying multiple AST documentation sets (books, guides, or document sets) stored in subdirectories under the backend's data folder.

- **`backend/`** — Express static file server and API. Serves JSON AST files produced by the `org.dita-bootstrap.ast` DITA-OT plugin, scans for documentation sets recursively (`toc.json`), and builds per-set MiniSearch indices.
- **`frontend/`** — Next.js + react-bootstrap web app that presents a card grid library landing page and renders AST topics into real `react-bootstrap` components with collapsible TOC sidebars and dark mode support.
- **`mcp-server/`** — MCP Server exposing DITA OASIS metadata, clean Markdown text context (`get_topic_content`), MiniSearch full-text search, and rich **MCP-UI** React component rendering (`render_topic_ui`) for AI interfaces.

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
# 1. backend (port 4000)
cd backend
npm install
npm run dev

# 2. frontend (port 3100)
cd frontend
npm install
npm run dev -- -p 3100

# 3. mcp-server (stdio or SSE)
cd mcp-server
npm install
npm run build
npm start -- --transport stdio
```

Open http://localhost:3100 for the Next.js web application.

## MCP Server Integration

The MCP server in `mcp-server/` can be added to your AI assistant configuration (Claude Desktop, Cursor, Antigravity, etc.):

```json
{
  "mcpServers": {
    "dita-docs": {
      "command": "node",
      "args": [
        "/path/to/react-harness/mcp-server/dist/mcp-server/src/index.js",
        "--transport", "stdio",
        "--data-dir", "/path/to/react-harness/backend/data"
      ]
    }
  }
}
```

### Key MCP Tools

- `list_documentation_sets` — Discovers documentation sets with DITA OASIS metadata.
- `get_toc` — Returns hierarchical Table of Contents.
- `search_documentation` — Full-text MiniSearch query across topics.
- `get_topic_content` — Returns clean Markdown text for LLM reasoning and question-answering.
- `render_topic_ui` — **MCP-UI Tool** returning a self-contained HTML/CSS frame rendering the interactive React UI.

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

Apache 2.0 — see `frontend/LICENSE`, `backend/LICENSE`, and `mcp-server/LICENSE`.
