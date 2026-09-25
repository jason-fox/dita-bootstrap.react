#!/bin/sh
set -e

# Explicitly enable single-container proxy rewrites in Next.js renderer for demo mode
export ENABLE_PROXY_REWRITES=true

# If DATA_ZIP_URL is provided, download and extract data files at startup
if [ -n "$DATA_ZIP_URL" ]; then
  echo "[demo] DATA_ZIP_URL specified. Downloading data package from ${DATA_ZIP_URL}..."
  mkdir -p /app/data
  if command -v wget >/dev/null 2>&1; then
    wget -qO /tmp/data.zip "$DATA_ZIP_URL"
  else
    curl -sSL "$DATA_ZIP_URL" -o /tmp/data.zip
  fi
  echo "[demo] Extracting data package into /app/data..."
  unzip -o /tmp/data.zip -d /app/data
  rm -f /tmp/data.zip
fi

echo "[demo] Starting AST Data Store on port 4000..."
PORT=4000 DATA_DIR=/app/data node /app/data-store/dist/index.js &

echo "[demo] Starting AST RAG Vector Search Service on port 4002..."
PORT=4002 DATA_DIR=/app/data node /app/rag-service/dist/index.js &

echo "[demo] Starting AST MCP Server on port 4001..."
PORT=4001 DATA_DIR=/app/data RAG_SERVICE_URL=http://127.0.0.1:4002 node /app/mcp-server/dist/mcp-server/src/index.js --transport http --port 4001 --data-dir /app/data &

# Wait 2 seconds for backend services to initialize
sleep 2

echo "[demo] Starting Next.js Renderer Portal on primary port ${PORT:-3000} (Proxy Rewrites: ON)..."
PORT=${PORT:-3000} HOSTNAME=0.0.0.0 node /app/renderer/server.js
