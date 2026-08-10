# Multi-stage build for Baatmeedar Backend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Run as non-root user
USER node

COPY --chown=node:node --from=builder /app /app

EXPOSE 3001

CMD ["node", "src/server.js"]
