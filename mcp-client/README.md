# Abstract Syntax Tree MCP Client

Standalone reference web chatbot client for the **AST MCP Server**, featuring real-time AI assistant chat with automatic Model Context Protocol (MCP) tool calling and interactive UI rendering.

> **Note**: The primary user-facing chatbot interface is integrated directly into `renderer` under the `/chat` route. `mcp-client` is retained as a standalone reference client.

## Features

- **LLM-Agnostic Support**: Compatible with Google Gemini, Anthropic Claude, OpenAI, and local/OpenAI-compatible LLM providers.
- **MCP Integration**: Connects via Streamable HTTP (`MCP_SERVER_URL`) to discover tools, search documentation, retrieve topic content, and execute MCP-UI rendering.
- **Dynamic Theming**: Full Bootswatch theme support (`BOOTSTRAP_THEME`), dark-mode detection, and custom CSS injection (`CUSTOM_CSS_PATH`).
- **Navbar Styling**: Simple, human-friendly navbar overrides (`NAVBAR_THEME` and `NAVBAR_TEXT`).
- **Tool Invocation Inspection**: Optional visibility into tool execution and parameters (`SHOW_TOOL_INVOCATIONS`).

## Installation

```console
cd mcp-client
npm install
npm run build
```

## Running

### Development Mode

```console
npm run dev
```

### Production Mode

```console
npm run build
npm start
```

The client will start by default at `http://localhost:3200`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3200` | HTTP port for the MCP web client server. |
| `MCP_SERVER_URL` | `http://localhost:4001/mcp` | Streamable HTTP endpoint of the `mcp-server`. |
| `CHAT_BOT_PROVIDER` | `gemini` | Active LLM provider (`gemini`, `anthropic`, `openai`, `ollama`). |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | *(none)* / `models/gemini-3.6-flash` | API key and model name when using Google Gemini. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | *(none)* / `claude-3-5-sonnet-20241022` | API key and model name when using Anthropic Claude. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | *(none)* / `gpt-4o` | API key and model name when using OpenAI. |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://host.docker.internal:11434/v1` / `qwen2.5:3b` | Base URL and model name when using Ollama or local LLM instances. |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). Defaults to `"default"` (standard Bootstrap). Dark-only themes automatically apply static dark styling and set `data-bs-theme="dark"`. |
| `NAVBAR_THEME` | `"dark"` | Navbar background theme (`dark` -> `bg-dark`, `primary` -> `bg-primary`, `light` -> `bg-light`, etc.). |
| `NAVBAR_TEXT` | `"dark"` | Navbar text scheme (`dark` -> `navbar-dark`, `light` -> `navbar-light`). |
| `DEFAULT_LANGUAGE` | `"en"` | Standard IETF BCP 47 language tag set on root `<html lang="...">` HTML element. |
| `CUSTOM_CSS_PATH` | *(none)* | Path or URL to an additional stylesheet to inject. Defaults to empty/null. |
| `SHOW_TOOL_INVOCATIONS` | `false` | When set to `true`, displays MCP tool call details and payload data in the UI response. |
| `WEB_CONCURRENCY` / `CLUSTER_MODE` | *(single)* | Set `WEB_CONCURRENCY=<number>` or `CLUSTER_MODE=true` to scale chatbot request handlers across multiple CPU cores. |

## API Endpoints

- `GET /api/health` — Returns system status, active LLM provider/model, MCP connection status, tool count, and active theme configuration.
- `GET /api/mcp/tools` — Lists all tools discovered from the connected MCP server.
- `POST /api/chat` — Accepts `{ message, history }` payload and generates LLM responses, automatically calling MCP tools as needed.

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
