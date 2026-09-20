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
ENV PORT=3200
ENV BUILD_VERSION=${BUILD_VERSION}

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

RUN npm ci --omit=dev || npm install --only=production

EXPOSE 3200

CMD ["node", "dist/index.js"]
