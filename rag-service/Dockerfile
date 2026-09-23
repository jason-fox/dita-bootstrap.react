FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci || npm install

COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

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

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --omit=dev || npm install --only=production

VOLUME ["/app/data"]
EXPOSE 4002

CMD ["node", "dist/index.js"]
