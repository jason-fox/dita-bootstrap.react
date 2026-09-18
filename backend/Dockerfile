FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install

COPY . .
RUN npm run build

# Volume mount point for DITA AST documentation sets
VOLUME ["/app/data"]

ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/index.js"]
