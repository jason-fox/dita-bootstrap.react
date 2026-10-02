# Multi-stage All-in-One Demo Container for DITA Bookshelf
# Packs data-store, mcp-server and renderers into a single container.
#
# Build (from react-harness/):
#   docker build -f demo/Dockerfile -t ghcr.io/jason-fox/ast-demo:latest .

# -------------------------------------------------------------
# Stage 1: Build All Node Applications
# -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# data-store is a standalone package with its own lockfile
COPY data-store ./data-store
# COPY rag-service ./rag-service
RUN cd data-store && npm ci && npm run build

# renderer, mcp-server and ast-ui are npm workspaces sharing one root lockfile
COPY package.json package-lock.json ./
COPY ast-ui/package.json ./ast-ui/
COPY mcp-server/package.json ./mcp-server/
COPY renderer/package.json ./renderer/
RUN npm ci -w mcp-server -w renderer

COPY ast-ui ./ast-ui
COPY mcp-server ./mcp-server
COPY renderer ./renderer

# Build mcp-server
RUN npm run build -w mcp-server

# Build renderer as a Next.js Standalone with demo proxy relative paths
# NOTE: ENABLE_PROXY_REWRITES=true MUST be set during this builder step 
# due to next build/transpilation. Next.js statically bakes next.config.js 
# rewrites into route manifests at build time.
ENV NEXT_TELEMETRY_DISABLED=1
ENV ENABLE_PROXY_REWRITES=true
ENV NEXT_PUBLIC_DATA_URL=/data
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_MCP_SERVER_URL=/mcp
RUN npm run build -w renderer

# -------------------------------------------------------------
# Stage 2: Production Runner
# -------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV ENABLE_PROXY_REWRITES=true
ENV INTERNAL_DATA_URL=http://127.0.0.1:4000/data
ENV INTERNAL_API_URL=http://127.0.0.1:4000/api
ENV MCP_SERVER_URL=http://127.0.0.1:4001/mcp

RUN apk add --no-cache curl unzip

# 1. Bake default chrome.json into image as startup fallback
COPY --from=builder /app/data-store/data/chrome.json /tmp/chrome.json

# 2. Copy compiled dist & install production dependencies for data-store
COPY --from=builder /app/data-store/package*.json ./data-store/
COPY --from=builder /app/data-store/dist ./data-store/dist
RUN cd data-store && npm ci --omit=dev

# 3. Copy compiled dist & install production dependencies for rag-service 
# (Optional - commented out for demo)
# COPY --from=builder /app/rag-service/package*.json ./rag-service/
# COPY --from=builder /app/rag-service/dist ./rag-service/dist
# RUN cd rag-service && npm ci --omit=dev

# 4. Install production dependencies for mcp-server from the workspace lockfile, then copy the bundled server
COPY package.json package-lock.json ./
COPY mcp-server/package.json ./mcp-server/
RUN npm ci -w mcp-server --omit=dev
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist

# 5. Copy Next.js standalone build & static assets for renderer; the standalone output nests the
# app under renderer/ because the tracing root is the workspace root
COPY --from=builder /app/renderer/.next/standalone ./web
COPY --from=builder /app/renderer/.next/static ./web/renderer/.next/static
COPY --from=builder /app/renderer/public ./web/renderer/public

# 6. Copy entrypoint script
COPY demo/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
