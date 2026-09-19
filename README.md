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

# 3. mcp-server (stdio or Streamable HTTP)
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
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `NAVBAR_THEME` | `"dark"` | Navbar background theme (`dark` -> `bg-dark`, `primary` -> `bg-primary`, `light` -> `bg-light`, etc.). |
| `NAVBAR_TEXT` | `"dark"` | Navbar text scheme (`dark` -> `navbar-dark`, `light` -> `navbar-light`). |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language code passed to root `<html lang="...">` element when not specified in topic metadata. |
| `OPEN_GRAPH_URL` | *(empty)* | Base URL used to construct `og:url` and `twitter:url` metadata tags (e.g. `http://localhost:3100`). |
| `CUSTOM_CSS_PATH` | *(null)* | Optional path or URL to an additional custom stylesheet. Defaults to adding nothing (null check). |
| `DOCS_TITLE` | `"Documentation"` / `"AI Assistant"` | Custom title displayed in navbar branding and header (`frontend` defaults to `"Documentation"`, `mcp-client` defaults to `"AI Assistant"`). |
| `DOCS_DESCRIPTION` | `"Documentation"` | Site description used in HTML metadata tags. |
| `NEXT_PUBLIC_DATA_URL` | `http://localhost:4000/data` | Base URL used to fetch `toc.json`, topic files, and search indices. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Base URL for backend API endpoints like `GET /api/docs`. |

### MCP Server (`mcp-server/`)

| Variable | Default | Description |
|---|---|---|
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for MCP-UI shell output. `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `NAVBAR_THEME` | `"dark"` | Navbar background theme (`dark` -> `bg-dark`, `primary` -> `bg-primary`, `light` -> `bg-light`, etc.). |
| `NAVBAR_TEXT` | `"dark"` | Navbar text scheme (`dark` -> `navbar-dark`, `light` -> `navbar-light`). |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag used for the root `<html lang="...">` attribute in `render_topic_ui` HTML output. |
| `FEATURED_DOCS` | *(empty)* | Comma-separated list of document set IDs to prioritize at the top of TOC listings and search discovery. |
| `CORPUS_SUMMARY_OVERRIDE` | *(null)* | Optional custom text description of the documentation corpus. Overrides automatic document title slicing for the LLM `docs://summary` resource. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional file path or URL to inject additional custom CSS into `render_topic_ui` HTML output. Defaults to adding nothing (null check). |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run multi-worker sticky-session cluster routing across CPU cores. |

### Chatbot Client (`mcp-client/`)

| Variable | Default | Description |
|---|---|---|
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for chatbot interface (`journal`, `darkly`, `flatly`, `cyborg`, etc.). `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `NAVBAR_THEME` | `"dark"` | Navbar background theme (`dark` -> `bg-dark`, `primary` -> `bg-primary`, `light` -> `bg-light`, etc.). |
| `NAVBAR_TEXT` | `"dark"` | Navbar text scheme (`dark` -> `navbar-dark`, `light` -> `navbar-light`). |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag set on root `<html lang="...">` HTML element. |
| `CORPUS_SUMMARY_OVERRIDE` | *(null)* | Optional custom text string injected into the chatbot's system prompt to describe loaded document sets. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional file path or URL to inject additional custom CSS into chatbot interface. Defaults to adding nothing (null check). |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to scale chatbot request handlers across multiple CPU cores. |

### Backend (`backend/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run pre-fork search indexing and multi-worker cluster server execution. |

## Customizing Branding, Favicons, and Default Links

### 1. Overriding Favicons & Icons
- **Frontend Portal (`frontend/`)**: Replace `frontend/public/favicon.svg` or `frontend/app/icon.svg` with your custom SVG icon file.
- **Chatbot Client (`mcp-client/`)**: Replace `mcp-client/public/favicon.svg` with your custom SVG icon file.

### 2. Overriding Navbar Branding Logo & Title (`header.html`)
To override the default navbar brand logo and title link:
- Place your custom HTML snippet in `public/header.html` (under `frontend/public/header.html` or `mcp-client/public/header.html`).
- **Example `public/header.html`**:
  ```html
  <a class="navbar-brand d-flex align-items-center fw-bold" href="/">
    <img src="/favicon.svg" alt="Logo" class="me-2" style="width: 1.75rem; height: 1.75rem;">
    <span>My Custom Documentation</span>
  </a>
  ```

### 3. Overriding Default Navigation Links (`nav-links.html`)
To customize global top navigation links in the header navbar:
- Place your custom HTML link list in `public/nav-links.html` (under `frontend/public/nav-links.html` or `mcp-client/public/nav-links.html`).
- **Example `public/nav-links.html`**:
  ```html
  <ul class="navbar-nav me-auto">
    <li class="nav-item">
      <a class="nav-link" href="https://example.com/docs">Main Portal</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="https://example.com/api">API Reference</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="https://github.com/my-org/my-repo">GitHub</a>
    </li>
  </ul>
  ```

## License

Apache 2.0 — see [LICENSE](LICENSE).
