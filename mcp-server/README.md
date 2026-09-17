# DITA Documentation MCP Server (with MCP-UI)

Model Context Protocol (MCP) server providing DITA documentation search, content retrieval, and rich **MCP-UI** React component rendering to AI assistants.

## Features

- **DITA OASIS Metadata**: Discovers all documentation sets and presents standard metadata (`title`, `navtitle`, `description`, `keywords`, `category`, `author`, `prodinfo`, `lang`).
- **Token-Efficient Context**: Converts raw AST JSON trees into clean **Markdown** for LLM question-answering and reasoning (`get_topic_content`).
- **Rich MCP-UI React Views**: Uses `react-dom/server` + `AstRenderer` to render self-contained HTML/CSS UI resources (`render_topic_ui`) with Bootstrap 5 components directly inside supporting AI interfaces.
- **Full-Text Search**: Scopes MiniSearch queries across all or individual documentation sets.
- **Dual Transport Support**: Supports `--transport stdio` (default for Claude Desktop / Cursor) and `--transport sse` (for web applications).

## Installation

```console
cd mcp-server
npm install
npm run build
```

## Running

### 1. Standard I/O Transport (`stdio` - default)

```console
npx dita-docs-mcp --transport stdio --data-dir ../backend/data
```

### 2. Server-Sent Events Transport (`sse`)

```console
npx dita-docs-mcp --transport sse --port 4001 --data-dir ../backend/data
```

## Available MCP Tools

| Tool | Parameters | Description |
|---|---|---|
| `list_documentation_sets` | *(none)* | Discovers and returns metadata for all available documentation sets. |
| `get_toc` | `docId` | Returns the hierarchical Table of Contents for a doc set. |
| `search_documentation` | `query`, `docId?` | Performs full-text MiniSearch query across topics. |
| `get_topic_content` | `docId`, `topicPath` | Returns clean Markdown text extracted from the topic for LLM reasoning. |
| `render_topic_ui` | `docId`, `topicPath`, `theme?` | **MCP-UI Tool**: Returns a self-contained HTML/CSS frame rendering the interactive React UI. |

## Available MCP Resources

- `docs://library` — JSON resource listing available documentation sets and OASIS metadata.
- `docs://{docId}/toc` — Table of contents resource.
- `docs://{docId}/topics/{topicPath}` — Direct Markdown resource for topic content.
- `ui://{docId}/topics/{topicPath}` — MCP-UI HTML resource.

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
