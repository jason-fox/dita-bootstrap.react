FROM node:22-alpine AS builder

ARG BUILD_VERSION=unknown
ENV NEXT_PUBLIC_BUILD_VERSION=${BUILD_VERSION}

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

ARG BUILD_VERSION=unknown
ENV NODE_ENV=production
ENV PORT=3100
ENV BUILD_VERSION=${BUILD_VERSION}

WORKDIR /app

# Copy standalone Next.js server bundle and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3100

CMD ["node", "server.js"]
