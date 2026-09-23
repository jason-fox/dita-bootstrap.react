# Abstract Syntax Tree MCP Server

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

Model Context Protocol (MCP) server providing DITA documentation search, content retrieval, and rich **MCP-UI** React component rendering to AI assistants.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Background

The Model Context Protocol (MCP) enables LLMs to interface directly with external knowledge tools and interactive visual frames. `mcp-server` bridges DITA documentation sets with AI assistants (Claude Desktop, Cursor, Antigravity, etc.) by exposing tools to discover OASIS metadata, fetch clean Markdown context, perform search, and render full interactive `react-bootstrap` UI components inline in chat windows using MCP-UI.

## Install

```console
cd mcp-server
npm install
npm run build
```

## Usage

### 1. Standard I/O Transport (`stdio` - Default)

```console
npx dita-docs-mcp --transport stdio --data-dir ../data-store/data
```

### 2. Streamable HTTP Transport (`http`)

```console
npx dita-docs-mcp --transport http --port 4001 --data-dir ../data-store/data
```

Serves the MCP Streamable HTTP spec on a single `/mcp` endpoint (`POST` for requests, `GET` for server-to-client SSE stream, `DELETE` to end a session).

## API

### Available MCP Tools

| Tool | Parameters | Description |
|---|---|---|
| `list_documentation_sets` | *(none)* | Discovers and returns metadata for all available documentation sets. |
| `get_toc` | `docId` | Returns the hierarchical Table of Contents for a doc set. |
| `search_documentation` | `query`, `docId?`, `lang?` | Search query across topics. Delegates to `rag-service` if configured, with MiniSearch fallback. |
| `get_topic_content` | `docId`, `topicPath` | Returns clean Markdown text extracted from topic AST for LLM reasoning. |
| `render_topic_ui` | `docId`, `topicPath`, `theme?` | **MCP-UI Tool**: Returns a self-contained HTML/CSS frame rendering interactive React UI. |

### Available MCP Resources

- `docs://library`: JSON resource listing available documentation sets and OASIS metadata.
- `docs://{docId}/toc`: Table of contents resource.
- `docs://{docId}/topics/{topicPath}`: Direct Markdown resource for topic content.
- `ui://{docId}/topics/{topicPath}`: MCP-UI HTML resource.

### Environment Variables & Options

| Parameter / Variable | Default | Description |
|---|---|---|
| `-p, --port` / `PORT` | `4001` | HTTP port when running with `--transport http`. |
| `-d, --data-dir` / `DATA_DIR` | `../data-store/data` | Path to data directory containing documentation sets. |
| `-r, --rag-service-url` / `RAG_SERVICE_URL` | *(none)* | Optional URL of standalone RAG vector search service (`http://localhost:4002`). |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name for MCP-UI shell output (`render_topic_ui`). |
| `NAVBAR_THEME` / `NAVBAR_TEXT` | `"dark"` / `"dark"` | Optional navbar theme and text scheme overrides. |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag used for root `<html lang="...">`. |
| `CUSTOM_CSS_PATH` | *(null)* | File path or URL to an additional custom stylesheet to inline into MCP-UI frames. |

## Contributing

PRs accepted. Refer to the root repository contributing guidelines.

## License

[Apache-2.0](../LICENSE) © Jason Fox
