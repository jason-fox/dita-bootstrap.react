# Stage 1: Build stage
FROM node:22-alpine AS builder

ARG BUILD_VERSION=unknown

WORKDIR /app

# Copy package manifests for mcp-server and frontend
COPY mcp-server/package*.json ./mcp-server/
COPY frontend/package*.json ./frontend/

WORKDIR /app/frontend
RUN npm ci || npm install

WORKDIR /app/mcp-server
RUN npm ci || npm install

WORKDIR /app
COPY mcp-server ./mcp-server
COPY frontend ./frontend

WORKDIR /app/mcp-server
RUN npm run build

# Stage 2: Runner stage
FROM node:22-alpine AS runner

ARG BUILD_VERSION=unknown
ENV NODE_ENV=production
ENV PORT=4001
ENV DATA_DIR=/app/data
ENV BUILD_VERSION=${BUILD_VERSION}

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
