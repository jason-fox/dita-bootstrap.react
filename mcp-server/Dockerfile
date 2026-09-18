FROM node:22-alpine

WORKDIR /app

# Copy package manifests for mcp-server and frontend
COPY mcp-server/package*.json ./mcp-server/
COPY frontend/package*.json ./frontend/

WORKDIR /app/mcp-server
RUN npm ci || npm install

WORKDIR /app
COPY mcp-server ./mcp-server
COPY frontend ./frontend

WORKDIR /app/mcp-server
RUN npm run build

# Volume mount point for DITA AST documentation sets
VOLUME ["/app/data"]

ENV DATA_DIR=/app/data
ENV PORT=4001

EXPOSE 4001

CMD ["node", "dist/mcp-server/src/index.js", "--transport", "http", "--port", "4001", "--data-dir", "/app/data"]
