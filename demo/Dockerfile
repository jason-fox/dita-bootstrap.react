# Multi-stage All-in-One Demo Container for DITA Bootstrap React Harness
# Packs data-store, mcp-server and renderers into a single container.

# -------------------------------------------------------------
# Stage 1: Build All Node Applications
# -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Copy service source trees
COPY data-store ./data-store
# COPY rag-service ./rag-service
COPY mcp-server ./mcp-server
COPY renderer ./renderer

# Build data-store
RUN cd data-store && npm ci && npm run build

# Install renderer dependencies first (required by mcp-server esbuild bundle)
RUN cd renderer && npm ci

# Build mcp-server
RUN cd mcp-server && npm ci && npm run build

# Build renderer (Next.js Standalone with demo proxy relative paths)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_DATA_URL=/data
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_MCP_SERVER_URL=/mcp
RUN cd renderer && npm run build

# -------------------------------------------------------------
# Stage 2: Production Runner
# -------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV ENABLE_PROXY_REWRITES=true

RUN apk add --no-cache curl unzip

# 2. Copy compiled dist & install production dependencies for data-store
COPY --from=builder /app/data-store/package*.json ./data-store/
COPY --from=builder /app/data-store/dist ./data-store/dist
RUN cd data-store && npm ci --omit=dev

# 3. Copy compiled dist & install production dependencies for rag-service (Optional - commented out for demo)
# COPY --from=builder /app/rag-service/package*.json ./rag-service/
# COPY --from=builder /app/rag-service/dist ./rag-service/dist
# RUN cd rag-service && npm ci --omit=dev

# 4. Copy compiled dist & install production dependencies for mcp-server
COPY --from=builder /app/mcp-server/package*.json ./mcp-server/
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
RUN cd mcp-server && npm ci --omit=dev

# 5. Copy Next.js standalone build & static assets for renderer
COPY --from=builder /app/renderer/.next/standalone ./renderer
COPY --from=builder /app/renderer/.next/static ./renderer/.next/static
COPY --from=builder /app/renderer/public ./renderer/public

# 6. Copy entrypoint script
COPY demo/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
