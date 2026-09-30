# All-in-One Demo Deployment (`react-harness/demo`)

This directory provides a pre-configured **All-in-One Docker Setup** that bundles three services (`data-store`, `mcp-server`, and `renderer`) into a single container image. The AST documentation itself is not baked in; it is supplied at startup via `DATA_ZIP_URL`.

It is designed specifically for cloud hosting or local Docker testing with a total memory footprint under **300 MB RAM**.

---

## Included Architecture

Inside the single Docker container:

| Service | Internal Port | Public Proxy Route | Purpose |
| :--- | :--- | :--- | :--- |
| **Next.js Renderer** | `3000` *(Primary)* | `/` | Web documentation portal & AI Assistant Chat |
| **Data Store API** | `4000` | `/api/*`, `/data/*` | Serves AST JSON files & MiniSearch index |
| **MCP Server** | `4001` | `/mcp` | Streamable HTTP MCP server for AI clients |

- **No RAG service**: `rag-service` is not part of the demo image (it is commented out in the Dockerfile and entrypoint), so the MCP server uses its built-in MiniSearch search.
- **Runtime-injected AST Data**: The image contains no documentation, only a fallback `chrome.json`. Set `DATA_ZIP_URL` to a ZIP of AST output and the entrypoint downloads and extracts it into `/app/data` at startup (see below). With the variable unset (the default) no documentation sets are loaded, unless you mount your own data at `/app/data`.
- **Unified Single-Port Routing**: Next.js proxies `/api/*`, `/data/*`, and `/mcp/*` requests internally to `localhost`, exposing a single HTTPS entrypoint.

---

## Environment Variables Reference

When running the container, environment variables are automatically inherited by all child processes (Data Store, MCP Server, and the Renderer, which also hosts the AI chat).

### Documentation Data
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATA_ZIP_URL` | URL of a ZIP of AST documentation (the `bootstrap-ast` transform output). It is downloaded and extracted into `/app/data` at startup, replacing any existing contents; a single nested folder is flattened, and the baked-in fallback `chrome.json` is restored if the ZIP has none. | *(empty: no documentation sets are loaded)* |

### AI Chatbot Provider Keys (Optional for `/chat`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `CHAT_BOT_PROVIDER` | Selected LLM provider (`gemini`, `openai`, `anthropic`, or `ollama`) | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini Model ID | `models/gemini-3.6-flash` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-proj-...` |
| `OPENAI_MODEL` | OpenAI Model ID | `gpt-4o` |
| `ANTHROPIC_API_KEY` | Anthropic API Key | `sk-ant-...` |
| `ANTHROPIC_MODEL` | Anthropic Model ID | `claude-3-5-sonnet-20241022` |

### Theme & Display Config
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `BOOTSTRAP_THEME` | Bootstrap theme name | `default` |
| `NAVBAR_THEME` | Navigation bar color scheme | `dark` |
| `NAVBAR_TEXT` | Navigation text color scheme | `dark` |
| `SHOW_TOOL_INVOCATIONS` | Render AI tool execution badges in chat | `false` |

---

## How to Pass Environment Variables

### Docker (`docker run`)

Pass your local `.env` file directly using `--env-file`:

```bash
docker run -p 3000:3000 --env-file .env dita-harness-demo
```

Or pass individual flags with `-e`:

```bash
docker run -p 3000:3000 \
  -e CHAT_BOT_PROVIDER=gemini \
  -e GEMINI_API_KEY="your-gemini-api-key" \
  dita-harness-demo
```

---

## 🚀 Building & Running

```bash
# 1. Build the demo container image (run from repo root)
docker build -f demo/Dockerfile -t dita-harness-demo .

# 2. Run with environment variables
docker run -p 3000:3000 --env-file .env dita-harness-demo
```
