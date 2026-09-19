# DITA Bootstrap React Frontend

Next.js + react-bootstrap web application that fetches `[type, props?, ...children]` JSON AST files (produced by the `dita-bootstrap.ast` DITA-OT plugin) and recursively renders them into real `react-bootstrap` components.

See the [top-level README](../README.md) for how this application connects with `backend/`.

## Key Features

- **Documentation Library Landing (`/`)**: Card grid displaying all discovered documentation sets, with title, topic count, and direct Browse links.
- **Dynamic Doc Set Viewer (`/<docId>/<topicPath>`)**: Dynamic routing for multi-set topics with side TOC navigation, breadcrumbs, scrollspy, and syntax-highlighted code blocks.
- **Contextual Search**: Client-side full-text search powered by MiniSearch, scoped to the currently active documentation set.
- **Customizable Title & Themes**: Site title configurable via environment variable (`DOCS_TITLE`), Bootswatch themes configurable via `BOOTSTRAP_THEME`, navbar background and text scheme configurable via `NAVBAR_THEME` and `NAVBAR_TEXT`, OpenGraph & Twitter base URL via `OPEN_GRAPH_URL`, and optional custom CSS injection via `CUSTOM_CSS_PATH`.

## Install

```console
npm install
```

## Run

```console
npm run dev -- -p 3100
```

Requires the backend running (default `http://localhost:4000`).

## Environment Variables

- `BOOTSTRAP_THEME` — Bootswatch theme name (`journal`, `darkly`, `flatly`, `cyborg`, etc.). Defaults to `"default"`. Setting `"default"` or `"none"` acts as a valid no-op using standard Bootstrap. Dark-only themes automatically apply `bootswatch-static.css` and set `data-bs-theme="dark"`.
- `NAVBAR_THEME` — Navbar background theme (`dark` -> `bg-dark`, `primary` -> `bg-primary`, `light` -> `bg-light`, etc.). Defaults to `"dark"`.
- `NAVBAR_TEXT` — Navbar text scheme (`dark` -> `navbar-dark`, `light` -> `navbar-light`). Defaults to `"dark"`.
- `OPEN_GRAPH_URL` — Base site URL used to generate `og:url` and `twitter:url` metadata tags (e.g. `http://localhost:3100` or `https://docs.example.com`).
- `CUSTOM_CSS_PATH` — Path or URL to an additional custom stylesheet. Defaults to `null`/empty (adds nothing).
- `DOCS_TITLE` — Site title displayed in header and page title (default `"Documentation"`).
- `DOCS_DESCRIPTION` — Site description for HTML metadata (default `"Documentation"`).
- `NEXT_PUBLIC_DATA_URL` — Base URL for JSON AST static files (default `http://localhost:4000/data`).
- `NEXT_PUBLIC_API_URL` — Base URL for backend API routes (default `http://localhost:4000/api`).

## Customizing Branding, Favicons & Navigation Links

### Favicons & Icons
- Replace `public/favicon.svg` or `app/icon.svg` with your custom SVG icon file.

### Header Logo & Branding (`header.html`)
- Override the navbar brand logo and site title by creating `public/header.html`:
  ```html
  <a class="navbar-brand d-flex align-items-center fw-bold" href="/">
    <img src="/favicon.svg" alt="Logo" class="me-2" style="width: 1.75rem; height: 1.75rem;">
    <span>My Custom Documentation</span>
  </a>
  ```

### Header Navigation Links (`nav-links.html`)
- Add custom navbar navigation links by creating `public/nav-links.html`:
  ```html
  <div class="navbar-nav">
    <a class="nav-link" href="https://example.com/api">API Reference</a>
    <a class="nav-link" href="https://github.com/my-org/my-repo">GitHub</a>
  </div>
  ```

## Structure

App Router files live at the package root (`app/`, `components/`, `lib/`, `public/`):

- `app/page.tsx` — Documentation library homepage grid
- `app/[...file]/page.tsx` — Doc set catch-all route viewer
- `components/` — AstRenderer, Header, Shell, Toc, Search, DarkModeToggle
- `lib/` — API helpers (`api.ts`), search index loader (`search.ts`)
- `public/` — Static assets and optional HTML fragments (`header.html`, `nav-links.html`)

## Scripts

- `npm run dev` — Start the Next.js dev server
- `npm run build` — Production build
- `npm run start` — Run the production build

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
