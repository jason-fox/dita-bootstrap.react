# DITA Bootstrap AST Harness & MCP Server

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A harness and Model Context Protocol (MCP) server for viewing, querying, and interacting with `dita-bootstrap.ast` transtype output.

This workspace supports discovering, rendering, and querying multiple Abstract Syntax Tree (AST) documentation sets (books, guides, or document collections) produced by the `org.dita-bootstrap.ast` DITA-OT plugin.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [License](#license)

## Background

The DITA-OT toolkit normally transforms DITA XML files into static HTML, PDFs etc. The `org.dita-bootstrap.ast` plugin instead creates documents
as JSON files in the form of an Abstract Syntax Tree (along with a
`toc.json` describing the structure of the header and footer)

This repository provides an integrated suite of services to consume the AST output:

- **`data-store/`**: Express static file server and API. Serves JSON AST files, discovers documentation sets recursively (`toc.json`), and builds MiniSearch indices for each document.
- **`rag-service/`**: *(Optional)* Standalone RAG vector search service. Transforms incoming AST topics into Markdown chunks, computes SHA-256 hashes for incremental sync and current-data verification, and provides a semantic vector search API endpoint.
- **`renderer/`**: Next.js + react-bootstrap web application. Presents a card grid library landing page, renders AST topics into real `react-bootstrap` components with collapsible TOC sidebars, and includes an integrated AI Assistant Chat (`/chat`).
- **`mcp-server/`**: Model Context Protocol (MCP) Server exposing DITA OASIS metadata, clean Markdown text context (`get_topic_content`), search, and rich **MCP-UI** React component rendering (`render_topic_ui`) for AI interfaces. Transparently delegates search to `rag-service` when configured, with automatic fallback to MiniSearch.
- **`mcp-client/`**: Standalone legacy reference web chatbot client for the MCP Server.

## Install

### Prerequisites

1.  Generate JSON AST output using a DITA-OT toolkit with `org.dita-bootstrap.ast` installed:

```console
dita --input=path/to/your.ditamap \
     --format=ast-chrome \
     --output=path/to/output
```

2. Sync the generated `chrome.json` file into `data-store/data/`:

```console
rsync -a --delete path/to/output/chrome.json data-store/data/chrome.json
```



3. For Each document:

- Generate JSON AST output using a DITA-OT toolkit with `org.dita-bootstrap.ast` installed:

```console
dita --input=path/to/your.ditamap \
     --format=ast-bootstrap \
     --output=path/to/output
```

- Sync the generated output directory into `data-store/data/`:

```console
rsync -a --delete path/to/output/ data-store/data/my-doc-set/
```

Any subdirectory in `data-store/data/` containing a `toc.json` file will automatically be discovered.

## Usage

### 1. Local Development Startup

```console
# 1. Start data-store (port 4000)
cd data-store
npm install
npm run dev

# 2. Start renderer (port 3100)
cd ../renderer
npm install
npm run dev -- -p 3100

# 3. Start mcp-server (stdio or Streamable HTTP port 4001)
cd ../mcp-server
npm install
npm run build
npm start -- --transport stdio
```

Open `http://localhost:3100` for the Next.js web application and integrated AI Assistant (`/chat`).

### 2. Docker Compose Startup

A docker compose is available to run all services locally.

```console
docker compose up -d
```

### 3. MCP Server Configuration

Add `mcp-server` to your AI assistant configuration (Claude Desktop, Cursor, Antigravity, etc.):

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

### Customizing Headers & Footers via DITA-OT Publishing

Navigation headers, footers, and layout branding are controlled at publish time using standard DITA-OT build parameters:

```console
dita --input=path/to/your.ditamap \
     --format=ast-bootstrap \
     --args.hdr=path/to/custom-header.xml \
     --args.ftr=path/to/custom-footer.xml \
     --output=data-store/data/my-doc-set
```

#### XML Template Placeholders & Interactive Roles

Header XML files (`custom-header.xml`) support standard Bootstrap XML markup along with special placeholders and roles processed during publishing:

- **`<document-title/>`**: XML placeholder element automatically replaced by DITA-OT with the published map/document set title.
- **`role="search"`**: Placed on search `<form>` elements; compiled into AST and intercepted by the React renderer to mount the live client-side search box.
- **`role="theme-toggle"`**: Placed on theme selector dropdowns; compiled into AST and intercepted by the React renderer to mount the Light/Dark mode selector.
- **`role="clear-chat"`**: Placed on buttons in the AI Assistant Chat header to clear conversation history and reset context.

#### Central Fallback Templates (`chrome.json`)

When a document set is published without explicit `--args.hdr` or `--args.ftr` files, `toc.json` omits document-specific header/footer trees. The web app automatically falls back to `data-store/data/chrome.json` (compiled from default plugin templates), which holds fallback layouts for:

- **`docs-page`**: Catalog landing page header navbar (`docs-page.header`) and card grid template (`docs-page.card`).
- **`chat-bot`**: AI Assistant header navbar (`chat-bot.header`), welcome card (`chat-bot.card`), and prompt submission bar (`chat-bot.form`).
- **`footer`**: Global fallback footer for all documentation pages.

## API

### MCP Server Tools

- **`list_documentation_sets`**: Discovers documentation sets with DITA OASIS metadata.
- **`get_toc`**: Returns hierarchical Table of Contents for a document set.
- **`search_documentation`**: Search query across topics. Delegates to `rag-service` if configured, with MiniSearch fallback.
- **`get_topic_content`**: Returns clean Markdown text for LLM reasoning.
- **`render_topic_ui`**: **MCP-UI Tool** returning a self-contained HTML/CSS frame rendering the interactive React UI.

### Environment Variables

#### Renderer (`renderer/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3100` | Port for the Next.js web application to listen on. |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language code for root `<html lang="...">`. |
| `OPEN_GRAPH_URL` | *(empty)* | Base URL used to construct `og:url` and `twitter:url` metadata tags. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional path or URL to an additional custom stylesheet. |
| `NEXT_PUBLIC_DATA_URL` / `INTERNAL_DATA_URL` | `http://localhost:4000/data` | Base URL used to fetch `toc.json`, topic files, and search indices. |
| `NEXT_PUBLIC_API_URL` / `INTERNAL_API_URL` | `http://localhost:4000/api` | Base URL for data-store API endpoints like `GET /api/docs`. |
| `NEXT_PUBLIC_MCP_SERVER_URL` / `MCP_SERVER_URL` | `http://localhost:4001/mcp` | Streamable HTTP endpoint of the `mcp-server` used by `/chat`. |
| `ENABLE_CHAT` | *(auto)* | Explicitly enable or disable `/chat` route (`true`/`false`). |
| `SHOW_TOOL_INVOCATIONS` | `false` | Set to `true` to display accordion details for MCP tool calls in AI Chat. |
| `CHAT_BOT_PROVIDER` | `"gemini"` | Active LLM provider for `/chat` (`gemini`, `anthropic`, `openai`, `ollama`). |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | *(none)* / `models/gemini-3.6-flash` | API key and model name when using Google Gemini. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | *(none)* / `claude-3-5-sonnet-20241022` | API key and model name when using Anthropic Claude. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | *(none)* / `gpt-4o` | API key and model name when using OpenAI. |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://host.docker.internal:11434/v1` / `qwen2.5:3b` | Base URL and model name when using Ollama. |

#### MCP Server (`mcp-server/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4001` | HTTP port when running with `--transport http`. |
| `DATA_DIR` | `./data-store/data` | Path to data-store data directory containing documentation sets. |
| `RAG_SERVICE_URL` | *(none)* | Optional URL of standalone RAG search service (`http://localhost:4002`). |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for MCP-UI shell output (`render_topic_ui`). |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag used for `render_topic_ui`. |
| `FEATURED_DOCS` | *(empty)* | Comma-separated list of document set IDs to prioritize in TOC listings. |
| `CORPUS_SUMMARY_OVERRIDE` | *(null)* | Optional custom description override for LLM `docs://summary` resource. |
| `CUSTOM_CSS_PATH` | *(null)* | Optional file path or URL to inject additional custom CSS into `render_topic_ui`. |
| `NAVBAR_THEME` / `NAVBAR_TEXT` | `"dark"` / `"dark"` | Optional navbar theme and text scheme overrides for `render_topic_ui`. |

#### Data Store (`data-store/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory containing documentation sets with `toc.json` files. |
| `DEFAULT_LANGUAGE` | `"en"` | Default language code for document discovery. |

#### RAG Service (`rag-service/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4002` | Port for the RAG service Express server to listen on. |
| `DATA_DIR` | `../data-store/data` | Directory containing documentation sets with `toc.json` files. |

## License

[Apache-2.0](LICENSE) © Jason Fox
