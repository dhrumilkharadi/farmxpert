# ============================================================================
# FarmXpert Node.js Backend — Production Dockerfile (Express 5)
# Multi-stage build, non-root, healthcheck-ready
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install production dependencies only
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

# bcrypt needs build tools on Alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./

# --omit=dev keeps the image lean (no pino-pretty, etc.)
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2: Production runner
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# curl for healthcheck
RUN apk add --no-cache curl

# Non-root user
RUN addgroup --system --gid 1001 farmxpert && \
    adduser  --system --uid 1001 --ingroup farmxpert backend

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src ./src

# Create archive directory (for ARCHIVE_URI=file://./archive)
RUN mkdir -p /app/archive && chown backend:farmxpert /app/archive

USER backend

EXPOSE 4000

ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
