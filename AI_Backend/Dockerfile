# ============================================================================
# FarmXpert AI Backend — Production Dockerfile (FastAPI + ML)
# Multi-stage build with slim Python for smaller image
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build dependencies (wheels) in a full image
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .

# Build wheels so the runner stage doesn't need gcc
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: Production runner (slim image, no compiler)
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runner

# libpq for asyncpg, curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Non-root user
RUN groupadd --system --gid 1001 farmxpert && \
    useradd  --system --uid 1001 --gid farmxpert aibackend

# Copy pre-built Python packages
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Remove files not needed in production
RUN rm -rf .cache __pycache__ tests .env .env.example .gitignore

# Create cache directory for ML models
RUN mkdir -p /app/.cache && chown aibackend:farmxpert /app/.cache

USER aibackend

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/orchestrator/health || exit 1

# Uvicorn with production settings:
#   --workers 2      : multi-process (tune per CPU; ECS task vCPU count)
#   --limit-concurrency 100 : back-pressure guard
#   --access-log     : ship to CloudWatch via stdout
CMD ["python", "-m", "uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--limit-concurrency", "100", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*", \
     "--access-log"]
