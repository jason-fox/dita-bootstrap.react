# DITA Bootstrap AST Harness & MCP Server

A harness and Model Context Protocol (MCP) server for viewing and querying `dita-bootstrap.ast` transtype output.
The workspace supports discovering and displaying multiple Abstract Syntax Tree (AST) documentation sets (books, guides, or document sets) stored in subdirectories under the data-store's data folder.

- **`data-store/`** — Express static file server and API. Serves JSON AST files produced by the `org.dita-bootstrap.ast` DITA-OT plugin, scans for documentation sets recursively (`toc.json`), and builds per-set MiniSearch indices.
- **`renderer/`** — Next.js + react-bootstrap web app that presents a card grid library landing page and renders AST topics into real `react-bootstrap` components with collapsible TOC sidebars and dark mode support.
- **`mcp-server/`** — MCP Server exposing DITA OASIS metadata, clean Markdown text context (`get_topic_content`), MiniSearch full-text search, and rich **MCP-UI** React component rendering (`render_topic_ui`) for AI interfaces.
- **`mcp-client/`** - LLM-agnostic web chatbot client for the MCP Server, featuring real-time AI assistant chat with automatic Model Context Protocol (MCP) tool calling and interactive UI rendering.

## Prerequisites

Generate JSON output with a DITA-OT toolkit that has the `org.dita-bootstrap.ast` plug-in installed, using the `ast-bootstrap` transtype:

```console
dita --input=path/to/your.ditamap \
     --format=ast-bootstrap \
     --output=path/to/output
```

Then sync the generated output folder into a subdirectory under `data-store/data/`:

```console
rsync -a --delete path/to/output/ data-store/data/my-doc-set/
```

Any subdirectory in `data-store/data/` containing a `toc.json` file will automatically be discovered as a documentation set.

## Running

```console
# 1. data-store (port 4000)
cd data-store
npm install
npm run dev

# 2. renderer (port 3100)
cd renderer
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
        "--data-dir", "/path/to/react-harness/data-store/data"
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

### Renderer (`renderer/`)

| Variable | Default | Description |
|---|---|---|
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language code passed to root `<html lang="...">` element when not specified in topic metadata. |
| `OPEN_GRAPH_URL` | *(empty)* | Base URL used to construct `og:url` and `twitter:url` metadata tags (e.g. `http://localhost:3100`). |
| `CUSTOM_CSS_PATH` | *(null)* | Optional path or URL to an additional custom stylesheet. Defaults to adding nothing (null check). |
| `NEXT_PUBLIC_DATA_URL` | `http://localhost:4000/data` | Base URL used to fetch `toc.json`, topic files, and search indices. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Base URL for data-store API endpoints like `GET /api/docs`. |

### MCP Server (`mcp-server/`)

| Variable | Default | Description |
|---|---|---|
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for MCP-UI shell output. `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag used for the root `<html lang="...">` attribute in `render_topic_ui` HTML output. |
| `FEATURED_DOCS` | *(empty)* | Comma-separated list of document set IDs to prioritize at the top of TOC listings and search discovery. |
| `CORPUS_SUMMARY_OVERRIDE` | *(null)* | Optional custom text description of the documentation corpus. Overrides automatic document title slicing for the LLM `docs://summary` resource. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional file path or URL to inject additional custom CSS into `render_topic_ui` HTML output. Defaults to adding nothing (null check). |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run multi-worker sticky-session cluster routing across CPU cores. |

### Chatbot Client (`mcp-client/`)

| Variable | Default | Description |
|---|---|---|
| `DATA_URL` | `http://localhost:4000/data` | URL of `data-store` for retrieving `chrome.json`. Startup fails with error code `1` if unavailable. |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for chatbot interface (`journal`, `darkly`, `flatly`, `cyborg`, etc.). `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag set on root `<html lang="...">` HTML element. |
| `CORPUS_SUMMARY_OVERRIDE` | *(null)* | Optional custom text string injected into the chatbot's system prompt to describe loaded document sets. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional file path or URL to inject additional custom CSS into chatbot interface. Defaults to adding nothing (null check). |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to scale chatbot request handlers across multiple CPU cores. |

### Data Store (`data-store/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run pre-fork search indexing and multi-worker cluster server execution. |

## Header, Card & Footer Customization via AST & chrome.json

Global layout templates and UI elements are driven by `chrome.json` in the data store, with document-specific overrides in `toc.json`:

- `chrome.json` (`docs-page.header`): Root document list header navbar for `renderer`.
- `chrome.json` (`docs-page.card`): Document card display template for the library landing page in `renderer`.
- `chrome.json` (`chat-bot`): Page title, description, welcome card (`card`), and prompt form (`form`) for `mcp-client`.
- `chrome.json` (`footer`): Global fallback footer for all documents, renderer landing page, and chatbot page.
- `toc.json` (`header` & `footer`): Individual documents use their own `header` if defined, and fall back to `chrome.json`'s `footer` if no individual document `footer` is present.

During DITA-OT publishing (`org.dita-bootstrap.ast`), include files are specified via build parameters:
- `--args.hdr`: Path to custom XML header template (defaults to standard Bootstrap navbar with branding, nav links, search box, and dark mode toggle).
- `--args.ftr`: Path to custom XML footer template (optional).

The AST includes support for:
- `<document-title/>` — automatically inserts the title of the document set.
- `role="search"` — intercepted by the renderer to render live client-side search.
- `role="theme-toggle"` — intercepted by the renderer to render the dark mode toggle button.

### Overriding Favicons & Icons
- **Renderer Portal (`renderer/`)**: Replace `renderer/public/favicon.svg` or `renderer/app/icon.svg` with your custom SVG icon file.
- **Chatbot Client (`mcp-client/`)**: Replace `mcp-client/public/favicon.svg` with your custom SVG icon file.

## License

Apache 2.0 — see [LICENSE](LICENSE).
