# DITA Bootstrap React

Next.js + react-bootstrap app that fetches a topic's `[type, props?, ...children]` JSON AST
(produced by the `dita-bootstrap.ast` DITA-OT plugin) and recursively renders it into real
`react-bootstrap` components.

See the [top-level README](../README.md) for how this fits together with `backend/`.

## Install

```console
npm install
```

## Run

```console
npm run dev -- -p 3100
```

Requires the backend running on port 4000 (see `backend/README.md`) - the default
`NEXT_PUBLIC_DATA_URL` already points at it, see the [top-level README](../README.md#environment)
if you need to override it.

Note: no directory here is named `src` - App Router files live at the package root
(`app/`, `components/`, `lib/`) instead of under a `src/` wrapper.

## Scripts

- `npm run dev` - start the Next.js dev server
- `npm run build` - production build
- `npm run start` - run the production build

## License

Apache License 2.0 - see [LICENSE](../LICENSE).
