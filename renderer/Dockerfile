FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

ARG BUILD_VERSION=0.0.1
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.title="AST Renderer"
LABEL org.opencontainers.image.description="Next.js web portal rendering DITA Abstract Syntax Tree topics into React Bootstrap components"
LABEL org.opencontainers.image.source="https://github.com/jason-fox/dita-bootstrap.react"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version=${BUILD_VERSION}
LABEL org.opencontainers.image.revision=${BUILD_REVISION}

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy standalone Next.js server bundle and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
