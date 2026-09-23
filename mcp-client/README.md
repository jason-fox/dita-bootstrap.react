# Abstract Syntax Tree MCP Client

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

Standalone reference web chatbot client for the AST MCP Server, featuring real-time AI assistant chat with Model Context Protocol (MCP) tool calling and interactive UI rendering.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Background

`mcp-client` acts as a standalone reference client demonstrating how web applications can interface with `mcp-server` over Streamable HTTP transport.

*Note: The primary user-facing chatbot interface is integrated directly into `renderer` under the `/chat` route.*

## Install

```console
cd mcp-client
npm install
npm run build
```

## Usage

### Development Mode

```console
npm run dev
```

### Production Mode

```console
npm run build
npm run start
```

Default URL: `http://localhost:3200`.

## API

### HTTP Endpoints

- **`GET /api/health`**: Returns system status, active LLM provider/model, MCP connection status, and tool count.
- **`GET /api/mcp/tools`**: Lists all tools discovered from the connected MCP server.
- **`POST /api/chat`**: Accepts `{ message, history }` payload and generates LLM responses, automatically calling MCP tools as needed.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3200` | HTTP port for the MCP web client server. |
| `MCP_SERVER_URL` | `http://localhost:4001/mcp` | Streamable HTTP endpoint of `mcp-server`. |
| `CHAT_BOT_PROVIDER` | `gemini` | Active LLM provider (`gemini`, `anthropic`, `openai`, `ollama`). |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | *(none)* / `models/gemini-3.6-flash` | API key and model name for Google Gemini. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | *(none)* / `claude-3-5-sonnet-20241022` | API key and model name for Anthropic Claude. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | *(none)* / `gpt-4o` | API key and model name for OpenAI. |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://host.docker.internal:11434/v1` / `qwen2.5:3b` | Base URL and model name for Ollama. |
| `BOOTSTRAP_THEME` | `"default"` | Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). |
| `SHOW_TOOL_INVOCATIONS` | `false` | Displays MCP tool call details and payload data in the UI response when true. |

## Contributing

PRs accepted. Refer to the root repository contributing guidelines.

## License

[Apache-2.0](../LICENSE) © Jason Fox
