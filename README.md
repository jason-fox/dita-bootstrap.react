# DITA Bootstrap AST Harness & MCP Server

A harness and Model Context Protocol (MCP) server for viewing and querying `dita-bootstrap.ast` transtype output.
The workspace supports discovering and displaying multiple Abstract Syntax Tree (AST) documentation sets (books, guides, or document sets) stored in subdirectories under the data-store's data folder.

- **`data-store/`** — Express static file server and API. Serves JSON AST files produced by the `org.dita-bootstrap.ast` DITA-OT plugin, scans for documentation sets recursively (`toc.json`), and builds per-set MiniSearch indices.
- **`rag-service/`** — *(Optional)* Standalone RAG vector search service. Transforms incoming AST topics into Markdown chunks, computes SHA-256 hashes for incremental sync and current-data verification, and provides a semantic vector search API endpoint.
- **`renderer/`** — Next.js + react-bootstrap web app that presents a card grid library landing page, renders AST topics into real `react-bootstrap` components with collapsible TOC sidebars, and includes an integrated AI Assistant Chat (`/chat`).
- **`mcp-server/`** — MCP Server exposing DITA OASIS metadata, clean Markdown text context (`get_topic_content`), search, and rich **MCP-UI** React component rendering (`render_topic_ui`) for AI interfaces. Transparently delegates search to `rag-service` when configured, with automatic fallback to MiniSearch.
- **`mcp-client/`** — Standalone legacy reference web chatbot client for the MCP Server.

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

# 3. mcp-server (stdio or Streamable HTTP port 4001)
cd mcp-server
npm install
npm run build
npm start -- --transport stdio
```

Open http://localhost:3100 for the Next.js web application and integrated AI Assistant (`/chat`).

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
| `PORT` | `3100` | Port for the Next.js web application to listen on. |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`. |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language code passed to root `<html lang="...">` element when not specified in topic metadata. |
| `OPEN_GRAPH_URL` | *(empty)* | Base URL used to construct `og:url` and `twitter:url` metadata tags (e.g. `http://localhost:3100`). |
| `CUSTOM_CSS_PATH` | *(null)* | Optional path or URL to an additional custom stylesheet. Defaults to adding nothing (null check). |
| `NEXT_PUBLIC_DATA_URL` / `INTERNAL_DATA_URL` | `http://localhost:4000/data` | Base URL used to fetch `toc.json`, topic files, and search indices. |
| `NEXT_PUBLIC_API_URL` / `INTERNAL_API_URL` | `http://localhost:4000/api` | Base URL for data-store API endpoints like `GET /api/docs`. |
| `NEXT_PUBLIC_MCP_SERVER_URL` / `MCP_SERVER_URL` | `http://localhost:4001/mcp` | Streamable HTTP endpoint of the `mcp-server` used by `/chat`. |
| `ENABLE_CHAT` | *(auto)* | Explicitly enable or disable the `/chat` route (`true`/`false`). Defaults to enabled if an LLM API key is present or using Ollama. |
| `SHOW_TOOL_INVOCATIONS` | `false` | Set to `true` to display expandable accordion details for MCP tool invocations in AI Chat responses. |
| `CHAT_BOT_PROVIDER` | `"gemini"` | Active LLM provider for `/chat` (`gemini`, `anthropic`, `openai`, `ollama`). |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | *(none)* / `models/gemini-3.6-flash` | API key and model name when using Google Gemini. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | *(none)* / `claude-3-5-sonnet-20241022` | API key and model name when using Anthropic Claude. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | *(none)* / `gpt-4o` | API key and model name when using OpenAI. |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://host.docker.internal:11434/v1` / `qwen2.5:3b` | Base URL and model name when using Ollama or local LLM instances. |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run multi-worker cluster node server execution. |

### MCP Server (`mcp-server/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4001` | HTTP port when running with `--transport http`. |
| `DATA_DIR` | `./data-store/data` | Path to data-store data directory containing documentation sets. |
| `RAG_SERVICE_URL` | *(none)* | Optional URL of the standalone RAG vector search service (`http://localhost:4002`). When set, `search_documentation` delegates to semantic RAG search with transparent MiniSearch fallback. |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for MCP-UI shell output (`render_topic_ui`). `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag used for the root `<html lang="...">` attribute in `render_topic_ui` HTML output. |
| `FEATURED_DOCS` | *(empty)* | Comma-separated list of document set IDs to prioritize at the top of TOC listings and search discovery. |
| `CORPUS_SUMMARY_OVERRIDE` | *(null)* | Optional custom text description of the documentation corpus. Overrides automatic document title slicing for the LLM `docs://summary` resource. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional file path or URL to inject additional custom CSS into `render_topic_ui` HTML output. |
| `NAVBAR_THEME` / `NAVBAR_TEXT` | `"dark"` / `"dark"` | Optional navbar theme and text scheme overrides for `render_topic_ui` HTML shell. |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run multi-worker cluster routing across CPU cores. |

### Data Store (`data-store/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |
| `DEFAULT_LANGUAGE` | `"en"` | Default language code for document discovery. |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to run pre-fork search indexing and multi-worker cluster server execution. |

For environment parameters specific to the legacy reference chatbot client, see [`mcp-client/README.md`](mcp-client/README.md).

## Header, Card & Footer Customization via AST & chrome.json

Global layout templates and UI elements are driven by `chrome.json` in the data store, with document-specific overrides in `toc.json`:

- `chrome.json` (`docs-page.header`): Root document list header navbar for `renderer`.
- `chrome.json` (`docs-page.card`): Document card display template for the library landing page in `renderer`.
- `chrome.json` (`chat-bot`): Header navbar, welcome card (`card`), and submission prompt form (`form`) for `renderer` AI Assistant (`/chat`).
- `chrome.json` (`footer`): Global fallback footer for all documents and `renderer` landing & chat pages.
- `toc.json` (`header` & `footer`): Individual documents use their own `header` if defined, and fall back to `chrome.json`'s `footer` if no individual document `footer` is present.

During DITA-OT publishing (`org.dita-bootstrap.ast`), include files are specified via build parameters:
- `--args.hdr`: Path to custom XML header template (defaults to standard Bootstrap navbar with branding, nav links, search box, and dark mode toggle).
- `--args.ftr`: Path to custom XML footer template (optional).

The AST includes support for:
- `<document-title/>` — automatically inserts the title of the document set.
- `role="search"` — intercepted by the renderer to render live client-side search.
- `role="theme-toggle"` — intercepted by the renderer to render the dark mode toggle button.
- `role="clear-chat"` — intercepted by `/chat` to clear conversation history.

### Overriding Favicons & Icons
- **Renderer Portal (`renderer/`)**: Replace `renderer/public/favicon.svg` or `renderer/app/icon.svg` with your custom SVG icon file.

## License

Apache 2.0 — see [LICENSE](LICENSE).
