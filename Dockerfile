# Multi-stage Dockerfile: build React frontend then run Node server.

# Build stage
FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/package-lock.json* ./server/
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential ca-certificates && rm -rf /var/lib/apt/lists/*
# Install root deps (dev tooling + vite)
COPY . .
RUN npm ci
RUN npm run build

# Runtime stage
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# copy server files
COPY --from=builder /app/server ./server
# copy built frontend
COPY --from=builder /app/dist ./dist
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev
EXPOSE 4000
# data volume for sqlite DB
VOLUME ["/data"]
# allow overriding DB location (container runtime should set DATA_DIR to /data/data.db)
ENV DATA_DIR=/data/data.db
RUN mkdir -p /data && chown -R node:node /app /data
USER node
CMD ["node", "index.js"]
