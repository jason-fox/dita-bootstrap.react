# DITA Bootstrap React Frontend

Next.js + react-bootstrap web application that fetches `[type, props?, ...children]` JSON AST files (produced by the `dita-bootstrap.ast` DITA-OT plugin) and recursively renders them into real `react-bootstrap` components.

See the [top-level README](../README.md) for how this application connects with `backend/`.

## Key Features

- **Documentation Library Landing (`/`)**: Card grid displaying all discovered documentation sets, with title, topic count, and direct Browse links.
- **Dynamic Doc Set Viewer (`/<docId>/<topicPath>`)**: Dynamic routing for multi-set topics with side TOC navigation, breadcrumbs, scrollspy, and syntax-highlighted code blocks.
- **Contextual Search**: Client-side full-text search powered by MiniSearch, scoped to the currently active documentation set.
- **Customizable Title & Headers**: Site title configurable via environment variable (`NEXT_PUBLIC_DOCS_TITLE` / `DOCS_TITLE`), with support for customizable header HTML fragments via `public/header.html` and `public/nav-links.html`.

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

- `NEXT_PUBLIC_DOCS_TITLE` / `DOCS_TITLE` — Site title displayed in header and page title (default `"Documentation"`).
- `NEXT_PUBLIC_DOCS_DESCRIPTION` / `DOCS_DESCRIPTION` — Site description for HTML metadata (default `"Documentation"`).
- `NEXT_PUBLIC_DATA_URL` — Base URL for JSON AST static files (default `http://localhost:4000/data`).
- `NEXT_PUBLIC_API_URL` — Base URL for backend API routes (default `http://localhost:4000/api`).

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
