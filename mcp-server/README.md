# Abstract Syntax Tree MCP Server

Model Context Protocol (MCP) server providing DITA documentation search, content retrieval, and rich **MCP-UI** React component rendering to AI assistants.

## Features

- **DITA OASIS Metadata**: Discovers all documentation sets and presents standard metadata (`title`, `navtitle`, `description`, `keywords`, `category`, `author`, `prodinfo`, `lang`).
- **Token-Efficient Context**: Converts raw AST JSON trees into clean **Markdown** for LLM question-answering and reasoning (`get_topic_content`).
- **Rich MCP-UI React Views**: Uses `react-dom/server` + `AstRenderer` to render self-contained HTML/CSS UI resources (`render_topic_ui`) with Bootstrap 5 components directly inside supporting AI interfaces.
- **Full-Text Search**: Scopes MiniSearch queries across all or individual documentation sets.
- **Dual Transport Support**: Supports `--transport stdio` (default for Claude Desktop / Cursor) and `--transport http` (Streamable HTTP, for web applications).

## Installation

```console
cd mcp-server
npm install
npm run build
```

## Running

### 1. Standard I/O Transport (`stdio` - default)

```console
npx dita-docs-mcp --transport stdio --data-dir ../data-store/data
```

### 2. Streamable HTTP Transport (`http`)

```console
npx dita-docs-mcp --transport http --port 4001 --data-dir ../data-store/data
```

Serves the current MCP Streamable HTTP spec on a single `/mcp` endpoint (`POST` for
requests, `GET` for the server-to-client SSE stream, `DELETE` to end a session),
identifying sessions via the `Mcp-Session-Id` response/request header.

## Available MCP Tools

| Tool | Parameters | Description |
|---|---|---|
| `list_documentation_sets` | *(none)* | Discovers and returns metadata for all available documentation sets. |
| `get_toc` | `docId` | Returns the hierarchical Table of Contents for a doc set. |
| `search_documentation` | `query`, `docId?` | Performs full-text MiniSearch query across topics. |
| `get_topic_content` | `docId`, `topicPath` | Returns clean Markdown text extracted from the topic for LLM reasoning. |
| `render_topic_ui` | `docId`, `topicPath`, `theme?` | **MCP-UI Tool**: Returns a self-contained HTML/CSS frame rendering the interactive React UI. Supports Bootswatch themes. |

## Environment Variables

- `BOOTSTRAP_THEME` — Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). Defaults to `"default"`. Setting `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`.
- `NAVBAR_THEME` — Navbar background theme (`dark` -> `bg-dark`, `primary` -> `bg-primary`, `light` -> `bg-light`, etc.). Defaults to `"dark"`.
- `NAVBAR_TEXT` — Navbar text scheme (`dark` -> `navbar-dark`, `light` -> `navbar-light`). Defaults to `"dark"`.
- `CUSTOM_CSS_PATH` — File path or URL to an additional custom stylesheet. Defaults to `null`/empty (adds nothing). If a local file path exists, its CSS content is inlined into the MCP-UI shell.

## Available MCP Resources

- `docs://library` — JSON resource listing available documentation sets and OASIS metadata.
- `docs://{docId}/toc` — Table of contents resource.
- `docs://{docId}/topics/{topicPath}` — Direct Markdown resource for topic content.
- `ui://{docId}/topics/{topicPath}` — MCP-UI HTML resource.

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
