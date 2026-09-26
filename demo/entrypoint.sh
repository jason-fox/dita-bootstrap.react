#!/bin/sh
set -e

# Explicitly enable single-container proxy rewrites in Next.js renderer for demo mode
export ENABLE_PROXY_REWRITES=true
export INTERNAL_DATA_URL=http://127.0.0.1:4000/data
export INTERNAL_API_URL=http://127.0.0.1:4000/api
export MCP_SERVER_URL=http://127.0.0.1:4001/mcp

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
  rm -rf /app/data/*
  unzip -o /tmp/data.zip -d /app/data
  rm -f /tmp/data.zip

  # If extracted into a single nested directory (e.g. /app/data/dita-demo-data/), flatten contents to /app/data/
  if [ ! -f /app/data/chrome.json ]; then
    nested_dir=$(find /app/data -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [ -n "$nested_dir" ]; then
      echo "[demo] Flattening nested directory $nested_dir into /app/data..."
      cp -r "$nested_dir"/* /app/data/ 2>/dev/null || true
      rm -rf "$nested_dir"
    fi
  fi
  echo "[demo] ZIP extraction complete. Data directory status:"
  ls -la /app/data
fi

echo "[demo] Starting AST Data Store on port 4000..."
PORT=4000 DATA_DIR=/app/data node /app/data-store/dist/index.js &

# Optional standalone RAG vector service commented out for demo build
# echo "[demo] Starting AST RAG Vector Search Service on port 4002..."
# PORT=4002 DATA_DIR=/app/data node /app/rag-service/dist/index.js &

echo "[demo] Starting AST MCP Server on port 4001 (MiniSearch fallback)..."
PORT=4001 DATA_DIR=/app/data node /app/mcp-server/dist/mcp-server/src/index.js --transport http --port 4001 --data-dir /app/data &

# Wait for data-store to be ready before starting Next.js renderer
echo "[demo] Waiting for data-store to be ready..."
until curl -sf http://127.0.0.1:4000/health > /dev/null 2>&1; do
  sleep 1
done
echo "[demo] data-store is ready."

echo "[demo] Starting Next.js Renderer Portal on primary port ${PORT:-3000} (Proxy Rewrites: ON)..."
PORT=${PORT:-3000} HOSTNAME=0.0.0.0 node /app/renderer/server.js
