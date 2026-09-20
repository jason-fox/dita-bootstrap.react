FROM node:22-alpine AS builder

ARG BUILD_VERSION=unknown

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

ARG BUILD_VERSION=unknown
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data
ENV BUILD_VERSION=${BUILD_VERSION}

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --omit=dev || npm install --only=production

VOLUME ["/app/data"]
EXPOSE 4000

CMD ["node", "dist/index.js"]
