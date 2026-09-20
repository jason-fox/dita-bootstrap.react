# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests for mcp-server and renderer
COPY mcp-server/package*.json ./mcp-server/
COPY renderer/package*.json ./renderer/

WORKDIR /app/renderer
RUN npm ci || npm install

WORKDIR /app/mcp-server
RUN npm ci || npm install

WORKDIR /app
COPY mcp-server ./mcp-server
COPY renderer ./renderer

WORKDIR /app/mcp-server
RUN npm run build

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

WORKDIR /app/mcp-server

# Copy package manifest and compiled dist from builder
COPY --from=builder /app/mcp-server/package*.json ./
COPY --from=builder /app/mcp-server/dist ./dist

# Install production dependencies only
RUN npm ci --omit=dev || npm install --only=production

# Volume mount point for DITA AST documentation sets
VOLUME ["/app/data"]

EXPOSE 4001

CMD ["node", "dist/mcp-server/src/index.js", "--transport", "http", "--port", "4001", "--data-dir", "/app/data"]
