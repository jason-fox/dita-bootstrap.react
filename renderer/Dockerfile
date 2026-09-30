# AST Renderer
# Next.js web portal rendering DITA AST topics into React Bootstrap components.
# Builds the npm workspaces, so the build context is the repo root, not renderer/.
#
# Build (from react-harness/):
#   docker build -f renderer/Dockerfile -t ghcr.io/jason-fox/ast-renderer:latest .

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY ast-ui/package.json ./ast-ui/
COPY renderer/package.json ./renderer/
RUN npm ci -w renderer

COPY ast-ui ./ast-ui
COPY renderer ./renderer
RUN npm run build -w renderer

FROM node:22-alpine AS runner

ARG BUILD_VERSION=0.0.1
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.title="AST Renderer"
LABEL org.opencontainers.image.description="Next.js web portal rendering DITA Abstract Syntax Tree topics into React Bootstrap components"
LABEL org.opencontainers.image.source="https://github.com/jason-fox/dita-bootstrap.react"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version=${BUILD_VERSION}
LABEL org.opencontainers.image.revision=${BUILD_REVISION}

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Standalone output is nested under the app directory because the tracing root is the workspace root
COPY --from=builder /app/renderer/public ./renderer/public
COPY --from=builder /app/renderer/.next/standalone ./
COPY --from=builder /app/renderer/.next/static ./renderer/.next/static

EXPOSE 3000

USER node

CMD ["node", "renderer/server.js"]
