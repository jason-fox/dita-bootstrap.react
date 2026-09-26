# DITA Bootstrap AST Harness & MCP Server

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A harness and Model Context Protocol (MCP) server for viewing, querying, and interacting with `dita-bootstrap.ast` transtype output.

This workspace supports discovering, rendering, and querying multiple Abstract Syntax Tree (AST) documentation sets (books, guides, or document collections) produced by the `org.dita-bootstrap.ast` DITA-OT plugin.

## Table of Contents

- [Background](#background)
- [Install & Publishing](#install--publishing)
  - [Generating AST](#1-generating-ast)
  - [Generating Chrome](#2-generating-chrome)
- [Usage](#usage)
- [API](#api)
- [License](#license)

## Background

The DITA-OT toolkit normally transforms DITA XML files into static HTML, PDFs etc. The `org.dita-bootstrap.ast` plugin instead creates documents as JSON files in the form of an Abstract Syntax Tree (along with a `toc.json` describing the structure of the header, footer, and navigation hierarchy).

This repository provides an integrated suite of services to consume and interact with AST output:

- **`data-store/`**: Express static file server and API. Serves JSON AST files, discovers documentation sets recursively (`toc.json`), and builds MiniSearch indices for each document set.
- **`rag-service/`**: *(Optional)* Standalone RAG vector search service listening on port `4002`. Transforms AST topics into clean Markdown chunks along `#` and `##` section boundaries, computes SHA-256 content hashes for incremental sync, verifies active `toc.json` manifests to purge deleted topics, and provides a semantic vector search API endpoint (`/api/search`).
- **`renderer/`**: Next.js + react-bootstrap web application. Presents a card grid library landing page, renders AST topics into real `react-bootstrap` components with collapsible TOC sidebars, and includes an integrated AI Assistant Chat (`/chat`).
- **`mcp-server/`**: Model Context Protocol (MCP) Server exposing DITA OASIS metadata, clean Markdown text context (`get_topic_content`), search, and rich **MCP-UI** React component rendering (`render_topic_ui`) for AI interfaces. Transparently delegates search to `rag-service` when configured via `RAG_SERVICE_URL`, with automatic fallback to MiniSearch.
- **`mcp-client/`**: Standalone reference web chatbot client for the MCP Server.

## Install & Publishing

### 1. Generating AST

Generate JSON AST topic files and document navigation manifests using the `ast-bootstrap` transformation type:

```console
# Publish documentation directly into the data-store directory:
dita --input=path/to/your.ditamap \
     --format=ast-bootstrap \
     --output=data-store/data/my-doc-set
```

Any subdirectory in `data-store/data/` containing a `toc.json` file will automatically be discovered by `data-store`.

#### Customizing Headers & Footers via Build Parameters

Navigation headers and footers are specified at AST build time using DITA-OT parameters:

```console
dita --input=path/to/your.ditamap \
     --format=ast-bootstrap \
     --args.hdr=path/to/custom-header.xml \
     --args.ftr=path/to/custom-footer.xml \
     --output=data-store/data/my-doc-set
```

You can reference existing XML include files as examples:
- `hdr.navbar.example.xml` — Example top navigation bar layout.
- `hdr.sidebar.example.xml` — Example sidebar header layout.
- `hdr.topbar.example.xml` — Example top bar header layout.
- `ftr.content.example.xml` — Example multi-column social and copyright footer layout.

#### Structure of Default Navigation Header (`hdr.navbar.default.xml`)

The default header layout template (`hdr.navbar.default.xml`) demonstrates how Bootstrap components, placeholders, and interactive roles compile into AST:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Navbar data-bs-theme="dark" expand="lg" sticky="top" bg="primary" variant="dark">
  <Container fluid="xxl" className="px-4">
    <NavbarToggle aria-controls="bdSidebar" aria-label="Toggle docs navigation" className="p-2 me-2">
      <Icon name="list"/>
    </NavbarToggle>
    <NavbarBrand className="d-flex align-items-center fw-semibold" href="/">
      <favicon/>
      <document-title/>
    </NavbarBrand>
    <NavbarToggle aria-controls="navbarContent" aria-label="Toggle navigation"/>
    <NavbarCollapse id="navbarContent">
      <Nav className="ms-auto align-items-lg-center">
        <Form className="position-relative mx-lg-2 search-box" role="search" data-bs-theme="light">
          <InputGroup>
            <InputGroupText className="bg-primary-subtle">
              <Icon name="search"/>
            </InputGroupText>
            <FormControl placeholder="Search…" aria-label="Search" dir="auto" type="search" value=""/>
          </InputGroup>
        </Form>
        <NavDropdown id="bd-theme" className="nav-item" role="theme-toggle" data-bs-theme="light">
          <NavDropdownItem data-bs-theme-value="light">
            <Icon name="brightness-high-fill" className="me-2"/>
            <span>Light</span>
          </NavDropdownItem>
          <NavDropdownItem data-bs-theme-value="dark">
            <Icon name="moon-stars-fill" className="me-2"/>
            <span>Dark</span>
          </NavDropdownItem>
          <NavDropdownItem data-bs-theme-value="auto">
            <Icon name="circle-half" className="me-2"/>
            <span>Auto</span>
          </NavDropdownItem>
        </NavDropdown>
      </Nav>
    </NavbarCollapse>
  </Container>
</Navbar>
```

- **Root `<Navbar>` Component**: Props (`data-bs-theme="dark"`, `expand="lg"`, `sticky="top"`, `bg="primary"`, `variant="dark"`) control responsive container collapse and theme styling.
- **XML Placeholders**:
  - `<document-title/>`: Substituted by DITA-OT during build time with the document map title.
  - `<favicon/>`: Replaced with the branding favicon element.
- **Interactive Roles**:
  - `role="search"`: Intercepted by the React renderer to mount the live client-side search component.
  - `role="theme-toggle"`: Intercepted by the React renderer to mount the interactive Light/Dark color mode switcher.

---

### 2. Generating Chrome

Generate central catalog and chat portal fallback layouts using the `ast-chrome` transformation type:

```console
# Generate central chrome layout:
dita --input=path/to/your.ditamap \
     --format=ast-chrome \
     --output=path/to/output

# Sync generated chrome.json into data-store:
rsync -a --delete path/to/output/chrome.json data-store/data/chrome.json
```

#### Central Fallback Templates (`chrome.json`)

When a document set is published without explicit `--args.hdr` or `--args.ftr` files, `toc.json` omits document-specific header/footer trees. The web app automatically falls back to `data-store/data/chrome.json`, which holds fallback layouts for:

- **`docs-page`**: Documentation portal title (`title`), description (`description`), catalog landing header navbar (`docs-page.header`), and card grid template (`docs-page.card`).
- **`chat-bot`**: AI Assistant page title (`title`), description (`description`), top header navbar (`chat-bot.header`), welcome card (`chat-bot.card`), and prompt submission form (`chat-bot.form`).
- **`texts`**: Internationalization UI string fallbacks (`noResults`, `tableOfContents`, `menubarNavigation`, `expand`, `collapse`).

#### Chrome Include Files as Examples

You can reference the following existing XML include files as functional examples:
- `chrome.content.docs-page.xml` — Defines catalog portal titles, descriptions, and document card grid templates (`<document-title/>`, `<document-description/>`).
- `chrome.navbar.chat-bot.xml` — Defines AI Assistant header navbar layout containing the Clear Chat button (`role="clear-chat"`) and theme toggle (`role="theme-toggle"`).
- `chrome.content.chat-bot.xml` — Defines AI Assistant welcome card (`#welcome-card`) with quick prompts and prompt submission form layout (`#chat-form`).

## Usage

### 1. Local Development Startup

```console
# 1. Start data-store (port 4000)
cd data-store
npm install
npm run dev

# 2. Start renderer (port 3000)
cd ../renderer
npm install
npm run dev

# 3. Start mcp-server (stdio or Streamable HTTP port 4001)
cd ../mcp-server
npm install
npm run build
npm start -- --transport stdio

# 4. Optional: Start rag-service (port 4002)
cd ../rag-service
npm install
npm run dev
```

Open `http://localhost:3000` for the Next.js web application and integrated AI Assistant (`/chat`).

### 2. Docker Compose Startup

Launch all documentation services (data-store, renderer, mcp-server, rag-service) locally:

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
| `PORT` | `3000` | Port for the Next.js web application to listen on. |
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
