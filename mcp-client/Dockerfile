# AST MCP Client
# LLM-agnostic chatbot client for the DITA AST MCP Server.
#
# Build (from react-harness/):
#   docker build -t ghcr.io/jason-fox/ast-mcp-client:latest mcp-client

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

ARG BUILD_VERSION=0.0.1
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.title="AST MCP Client"
LABEL org.opencontainers.image.description="LLM-agnostic chatbot client for the Abstract Syntax Tree DITA documentation MCP Server"
LABEL org.opencontainers.image.source="https://github.com/jason-fox/dita-bootstrap.react"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version=${BUILD_VERSION}
LABEL org.opencontainers.image.revision=${BUILD_REVISION}

ENV NODE_ENV=production
ENV PORT=3200

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

RUN npm ci --omit=dev || npm install --only=production

EXPOSE 3200

CMD ["node", "dist/index.js"]
