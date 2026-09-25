# All-in-One Demo Deployment (`react-harness/demo`)

This directory provides a pre-configured **All-in-One Docker Setup** that bundles all four microservices (`data-store`, `rag-service`, `mcp-server`, and `renderer`) along with pre-rendered AST documentation into a single container image.

It is designed specifically for **free-tier demo hosting** (e.g. [Koyeb](https://www.koyeb.com/), [Render](https://render.com/), or local Docker testing) with a total memory footprint under **300 MB RAM**.

---

## 🏗️ Included Architecture

Inside the single Docker container:

| Service | Internal Port | Public Proxy Route | Purpose |
| :--- | :--- | :--- | :--- |
| **Next.js Renderer** | `3000` *(Primary)* | `/` | Web documentation portal & AI Assistant Chat |
| **Data Store API** | `4000` | `/api/*`, `/data/*` | Serves AST JSON files & MiniSearch index |
| **RAG Vector Search** | `4002` | *(Internal)* | TF-IDF section chunk vector search |
| **MCP Server** | `4001` | `/mcp` | Streamable HTTP MCP server for AI clients |

- **Baked-in AST Data**: The AST topic files in `data-store/data` are copied directly into `/app/data` inside the image, requiring zero external volume mounts or persistent storage.
- **Unified Single-Port Routing**: Next.js proxies `/api/*`, `/data/*`, and `/mcp/*` requests internally to `localhost`, exposing a single HTTPS entrypoint.

---

## ⚙️ Environment Variables Reference

When running the container, environment variables are automatically inherited by all child microservices (Chatbot, Data Store, MCP Server, and UI Renderer).

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

## 🔑 How to Pass Environment Variables

### 1. Local Docker (`docker run`)

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

### 2. Koyeb (Free Tier Platform)

#### Via Koyeb Web Console:
1. Open your App in the [Koyeb Console](https://app.koyeb.com/).
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Click **Add Variable** and enter your keys (e.g. `GEMINI_API_KEY`, `CHAT_BOT_PROVIDER`).
4. *(Best Practice for Secrets)*: Store API keys under the **Secrets** tab in Koyeb and set the variable value to `@secret-name`.
5. Click **Save and Deploy**.

#### Via Koyeb CLI:
```bash
koyeb service update app-name/service-name \
  --env CHAT_BOT_PROVIDER=gemini \
  --env GEMINI_API_KEY=your_key_here
```

---

### 3. Render

1. Go to your Web Service in the [Render Dashboard](https://dashboard.render.com/).
2. Navigate to **Environment**.
3. Click **Add Environment Variable** (or **Add Secret File** to copy-paste your `.env` content).
4. Save Changes to trigger an automatic redeploy.

---

### 4. Fly.io

Set encrypted runtime secrets using the Fly CLI:

```bash
fly secrets set \
  CHAT_BOT_PROVIDER=gemini \
  GEMINI_API_KEY="your-gemini-api-key"
```

---

## 🚀 Building & Running

```bash
# 1. Build the demo container image (run from repo root)
docker build -f demo/Dockerfile -t dita-harness-demo .

# 2. Run with environment variables
docker run -p 3000:3000 --env-file .env dita-harness-demo
```
