# AST MCP Server
# Model Context Protocol server for DITA AST documentation with MCP-UI React rendering.
# Builds the npm workspaces, so the build context is the repo root, not mcp-server/.
#
# Build (from react-harness/):
#   docker build -f mcp-server/Dockerfile -t ghcr.io/jason-fox/ast-mcp-server:latest .

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Only the workspaces being installed need their manifests: mcp-server and its ast-ui dependency
COPY package.json package-lock.json ./
COPY ast-ui/package.json ./ast-ui/
COPY mcp-server/package.json ./mcp-server/
RUN npm ci -w mcp-server

COPY ast-ui ./ast-ui
COPY mcp-server ./mcp-server

RUN npm run build -w mcp-server

# Stage 2: Runner stage
FROM node:22-alpine AS runner

ARG BUILD_VERSION=0.0.1
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.title="AST MCP Server"
LABEL org.opencontainers.image.description="Model Context Protocol server for Abstract Syntax Tree DITA documentation with MCP-UI React rendering"
LABEL org.opencontainers.image.source="https://github.com/jason-fox/dita-bootstrap.react"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version=${BUILD_VERSION}
LABEL org.opencontainers.image.revision=${BUILD_REVISION}

ENV NODE_ENV=production
ENV PORT=4001
ENV DATA_DIR=/app/data

WORKDIR /app

# Production dependencies only; ast-ui is a devDependency (bundled at build time), so it isn't needed here
COPY package.json package-lock.json ./
COPY mcp-server/package.json ./mcp-server/
RUN npm ci -w mcp-server --omit=dev

COPY --from=builder /app/mcp-server/dist ./mcp-server/dist

WORKDIR /app/mcp-server

# Volume mount point for DITA AST documentation sets
VOLUME ["/app/data"]

EXPOSE 4001

CMD ["node", "dist/index.js", "--transport", "http", "--port", "4001", "--data-dir", "/app/data"]
