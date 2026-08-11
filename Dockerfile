# Baatmeedar Backend — Multi-stage Production Dockerfile
# ─────────────────────────────────────────────────────────
# Build: docker build -t baatmeedar-api .
# Run:   docker run -p 10000:10000 --env-file .env baatmeedar-api

# ── Base Stage ───────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache curl dumb-init

# ── Dependencies Stage ───────────────────────────────────
FROM base AS dependencies
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Production Stage ─────────────────────────────────────
FROM node:22-alpine AS release

LABEL org.opencontainers.image.title="baatmeedar-api"
LABEL org.opencontainers.image.description="Baatmeedar backend verification service"
LABEL org.opencontainers.image.source="https://github.com/baatmeedar/baatmeedar"

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Run as non-root user
USER node

# Copy dependencies and application source
COPY --chown=node:node --from=dependencies /app/server/node_modules ./server/node_modules
COPY --chown=node:node server/package.json ./server/package.json
COPY --chown=node:node server/src ./server/src
COPY --chown=node:node server/scripts ./server/scripts

WORKDIR /app/server

ENV NODE_ENV=production
# PORT is injected by Render at runtime — do NOT hardcode it here
# Default to 10000 (Render's default) for local Docker runs; override with --env PORT=...
ENV PORT=10000

EXPOSE 10000

# Use dumb-init as PID 1 for proper signal forwarding
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail --silent http://localhost:${PORT:-10000}/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
