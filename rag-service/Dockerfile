# AST RAG Service
# Optional standalone RAG vector search service for AST DITA documentation.
#
# Build (from react-harness/):
#   docker build -t ghcr.io/jason-fox/ast-rag-service:latest rag-service
#   docker build --build-arg EMBED_MODEL=bge-base-en-v1.5 -t ghcr.io/jason-fox/ast-rag-service:en rag-service
#
# EMBED_MODEL is baked into the image (see src/models.ts); override at runtime only for a model already fetched.
# (Debian rather than Alpine: onnxruntime-node needs glibc.)

FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci || npm install

COPY src ./src
RUN npm run build

FROM node:22-slim AS runner

ARG EMBED_MODEL=bge-m3
ARG EMBED_DTYPE=q8
ARG BUILD_VERSION=0.0.1
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.title="AST RAG Service"
LABEL org.opencontainers.image.description="Optional standalone RAG vector search service for AST DITA documentation"
LABEL org.opencontainers.image.source="https://github.com/jason-fox/dita-bootstrap.react"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version=${BUILD_VERSION}
LABEL org.opencontainers.image.revision=${BUILD_REVISION}

ENV NODE_ENV=production
ENV PORT=4002
ENV DATA_DIR=/app/data
ENV EMBED_MODEL=${EMBED_MODEL}
ENV EMBED_DTYPE=${EMBED_DTYPE}
ENV MODEL_DIR=/app/models
ENV CACHE_DIR=/app/cache

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --omit=dev || npm install --only=production

RUN node dist/prefetch.js
ENV HF_OFFLINE=true

VOLUME ["/app/data", "/app/cache"]
EXPOSE 4002

CMD ["node", "dist/index.js"]
