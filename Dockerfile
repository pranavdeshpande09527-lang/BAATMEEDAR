# Baatmeedar Backend — Multi-stage Production Dockerfile
# Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-reqs --no-cache curl

# Dependencies Stage
FROM base AS dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Production Stage
FROM node:20-alpine AS release
WORKDIR /app

# Run as non-root user
USER node

# Copy dependencies and application source
COPY --chown=node:node --from=dependencies /app/server/node_modules ./server/node_modules
COPY --chown=node:node server ./server

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health/live || exit 1

CMD ["node", "src/server.js"]
