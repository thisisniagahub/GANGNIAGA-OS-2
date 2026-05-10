# GangNiaga AI OS — Deployment Guide

> **Version:** 4.0  
> **Last Updated:** 2026-03-04  
> **Platform:** Next.js 16 (App Router) · Prisma ORM · SQLite/PostgreSQL

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Production Build](#3-production-build)
4. [Docker Deployment](#4-docker-deployment)
5. [Environment Variables](#5-environment-variables)
6. [Database Setup](#6-database-setup)
7. [SSL/TLS Configuration](#7-ssltls-configuration)
8. [Monitoring & Health Checks](#8-monitoring--health-checks)
9. [Backup Strategy](#9-backup-strategy)
10. [Scaling Considerations](#10-scaling-considerations)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### 1.1 Required Software

| Software | Minimum Version | Recommended Version | Purpose |
|----------|----------------|---------------------|---------|
| Node.js | 18.0+ | 20.x LTS | JavaScript runtime |
| Bun | 1.0+ | 1.2+ | Package manager and fast runtime |
| Git | 2.30+ | Latest | Version control |
| SQLite | 3.35+ | Latest (bundled) | Development database |

### 1.2 Optional Software (Production)

| Software | Version | Purpose |
|----------|---------|---------|
| PostgreSQL | 15+ | Production database (recommended) |
| Redis | 7+ | Session store, rate limiting, caching |
| Caddy | 2.x | Reverse proxy with automatic HTTPS |
| Docker | 24+ | Containerized deployment |
| Docker Compose | 2.20+ | Multi-container orchestration |

### 1.3 External Service Accounts

| Service | Required | Purpose |
|---------|----------|---------|
| z-ai-web-dev-sdk API key | Yes | LLM access for all AI operations |
| Intuit Developer | Optional | QuickBooks Online OAuth integration |
| Xero Developer | Optional | Xero OAuth integration |
| Stripe | Optional | Subscription billing |

### 1.4 System Requirements

| Environment | CPU | RAM | Disk | Network |
|-------------|-----|-----|------|---------|
| Development | 2 cores | 4 GB | 1 GB | — |
| Staging | 2 cores | 4 GB | 10 GB | 10 Mbps |
| Production (small) | 4 cores | 8 GB | 50 GB SSD | 100 Mbps |
| Production (medium) | 8 cores | 16 GB | 200 GB SSD | 500 Mbps |
| Production (large) | 16 cores | 32 GB | 500 GB SSD | 1 Gbps |

---

## 2. Local Development Setup

### 2.1 Clone & Install

```bash
# Clone the repository
git clone https://github.com/gangniaga/gangniaga-ai-os.git
cd gangniaga-ai-os

# Install dependencies using Bun
bun install

# Generate Prisma client
bun run db:generate
```

### 2.2 Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file
# At minimum, set DATABASE_URL and Z_AI_API_KEY
nano .env
```

Minimal `.env` for local development:

```env
# Database
DATABASE_URL="file:./db/custom.db"

# AI SDK
Z_AI_API_KEY="your-z-ai-api-key-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 2.3 Database Setup

```bash
# Push the schema to create tables
bun run db:push

# (Optional) Reset the database
bun run db:reset
```

### 2.4 Start Development Server

```bash
# Start the Next.js dev server on port 3000
bun run dev
```

The application will be available at `http://localhost:3000`.

### 2.5 Verify Installation

| Check | URL | Expected |
|-------|-----|----------|
| App loads | `http://localhost:3000` | Login page renders |
| API health | `http://localhost:3000/api/auth/session` | JSON response with `user: null` |
| Database | Create a user via `/api/auth/register` | 200 OK response |
| AI Agent | Send a chat message via Copilot page | AI response with agent type |

### 2.6 Development Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start Next.js dev server on port 3000 |
| `build` | `bun run build` | Create production build with standalone output |
| `start` | `bun run start` | Start production server from standalone build |
| `lint` | `bun run lint` | Run ESLint on all files |
| `db:push` | `bun run db:push` | Push Prisma schema to database (no migrations) |
| `db:generate` | `bun run db:generate` | Generate Prisma client from schema |
| `db:migrate` | `bun run db:migrate` | Create and apply Prisma migration |
| `db:reset` | `bun run db:reset` | Reset database and apply all migrations |

---

## 3. Production Build

### 3.1 Build Process

The Next.js production build uses the `standalone` output mode, which creates a minimal server bundle without `node_modules`:

```bash
# Build the application
bun run build

# This executes:
# 1. next build                    — Compiles all pages and API routes
# 2. cp -r .next/static .next/standalone/.next/     — Copy static assets
# 3. cp -r public .next/standalone/                  — Copy public directory
```

### 3.2 Build Output Structure

```
.next/standalone/
├── .next/
│   └── static/          # Static assets (JS, CSS, images)
├── public/              # Public assets (logo.svg, robots.txt)
├── server.js            # Entry point for standalone server
├── package.json         # Minimal dependencies
└── node_modules/        # Only required runtime deps
```

### 3.3 Running the Production Server

```bash
# Start the production server
NODE_ENV=production bun .next/standalone/server.js
```

Or with the npm script:

```bash
bun run start
```

The server starts on port 3000 by default. Override with the `PORT` environment variable:

```bash
PORT=8080 NODE_ENV=production bun .next/standalone/server.js
```

### 3.4 Build Optimization

| Setting | Value | Location | Purpose |
|---------|-------|----------|---------|
| `output` | `"standalone"` | `next.config.ts` | Minimal server bundle |
| `reactStrictMode` | `false` | `next.config.ts` | Disabled for production performance |
| `ignoreBuildErrors` | `true` | `next.config.ts` | Skip TypeScript errors in build (remove in v4.1) |

### 3.5 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables (see Section 5)
- [ ] Run database migrations (`bun run db:push` or `prisma migrate deploy`)
- [ ] Verify database connectivity
- [ ] Test API health endpoint
- [ ] Configure reverse proxy (Caddy/Nginx) with SSL
- [ ] Set up monitoring and health checks
- [ ] Configure backup schedule
- [ ] Test QuickBooks/Xero OAuth flows (if enabled)
- [ ] Verify rate limiting is active (check response headers)
- [ ] Test authentication flow end-to-end

---

## 4. Docker Deployment

### 4.1 Dockerfile

```dockerfile
# ---- Stage 1: Build ----
FROM oven/bun:1.2 AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build the application
RUN bun run build

# ---- Stage 2: Production ----
FROM oven/bun:1.2-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy database directory (for SQLite)
COPY --from=builder /app/db ./db

# Copy Prisma schema for potential migrations
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/session || exit 1

# Start the server
CMD ["bun", "server.js"]
```

### 4.2 Docker Compose (Full Stack)

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gangniaga-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./db/custom.db
      - Z_AI_API_KEY=${Z_AI_API_KEY}
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - app-data:/app/db          # Persist SQLite database
      - app-uploads:/app/uploads  # Persist uploaded files
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/auth/session"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - gangniaga

  caddy:
    image: caddy:2-alpine
    container_name: gangniaga-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      app:
        condition: service_healthy
    networks:
      - gangniaga

volumes:
  app-data:
  app-uploads:
  caddy-data:
  caddy-config:

networks:
  gangniaga:
    driver: bridge
```

### 4.3 Docker Compose with PostgreSQL

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gangniaga-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://gangniaga:${DB_PASSWORD}@postgres:5432/gangniaga
      - Z_AI_API_KEY=${Z_AI_API_KEY}
      - NODE_ENV=production
      - PORT=3000
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - gangniaga

  postgres:
    image: postgres:16-alpine
    container_name: gangniaga-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=gangniaga
      - POSTGRES_USER=gangniaga
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gangniaga"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - gangniaga

  redis:
    image: redis:7-alpine
    container_name: gangniaga-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - gangniaga

  caddy:
    image: caddy:2-alpine
    container_name: gangniaga-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      app:
        condition: service_healthy
    networks:
      - gangniaga

volumes:
  postgres-data:
  redis-data:
  caddy-data:
  caddy-config:

networks:
  gangniaga:
    driver: bridge
```

### 4.4 Docker Commands

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database)
docker compose down -v

# Restart just the app
docker compose restart app

# Run database migration
docker compose exec app bun run db:push

# Shell into the app container
docker compose exec app sh

# Pull latest and rebuild
docker compose pull && docker compose up -d --build
```

---

## 5. Environment Variables

### 5.1 Required Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `DATABASE_URL` | Prisma database connection string | `file:./db/custom.db` (SQLite) or `postgresql://user:pass@host:5432/db` | — |
| `Z_AI_API_KEY` | API key for z-ai-web-dev-sdk (LLM access) | `sk-abc123...` | — |

### 5.2 Application Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `NODE_ENV` | Runtime environment | `production` | `development` |
| `PORT` | Server port | `3000` | `3000` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | `https://app.gangniaga.com` | `http://localhost:3000` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` | `0` |

### 5.3 Authentication Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `SESSION_SECRET` | Secret for session cookie signing | `32-char-random-string` | (none) |
| `SESSION_MAX_AGE` | Session cookie max age in seconds | `604800` (7 days) | `604800` |
| `BCRYPT_ROUNDS` | bcrypt hash rounds for passwords | `12` | `10` |

### 5.4 Integration Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `QUICKBOOKS_CLIENT_ID` | Intuit OAuth client ID | `ABcdEf...` | — |
| `QUICKBOOKS_CLIENT_SECRET` | Intuit OAuth client secret | `secret123...` | — |
| `QUICKBOOKS_REDIRECT_URI` | OAuth redirect URI | `https://app.gangniaga.com/api/integrations/quickbooks/callback` | — |
| `QUICKBOOKS_ENVIRONMENT` | Sandbox or production | `sandbox` / `production` | `sandbox` |
| `XERO_CLIENT_ID` | Xero OAuth client ID | `ABcdEf...` | — |
| `XERO_CLIENT_SECRET` | Xero OAuth client secret | `secret123...` | — |
| `XERO_REDIRECT_URI` | OAuth redirect URI | `https://app.gangniaga.com/api/integrations/xero/callback` | — |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_live_...` | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` | — |

### 5.5 Encryption Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `ENCRYPTION_KEY` | AES-256 key for encrypting OAuth tokens | `base64-encoded-32-byte-key` | — |
| `API_KEY_SALT` | Additional salt for API key hashing | `random-salt-string` | — |

### 5.6 Rate Limiting Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `RATE_LIMIT_ENABLED` | Enable/disable rate limiting | `true` | `true` |
| `RATE_LIMIT_DEFAULT_MAX` | Default max requests per window | `60` | `60` |
| `RATE_LIMIT_DEFAULT_WINDOW` | Default window in milliseconds | `60000` | `60000` |

### 5.7 Logging & Observability

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging verbosity | `info` | `info` |
| `LOG_FORMAT` | Log output format | `json` / `text` | `text` |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://xxx@sentry.io/123` | — |

### 5.8 Environment File Template

```env
# ============================================
# GangNiaga AI OS — Environment Configuration
# ============================================

# ---- Required ----
DATABASE_URL="file:./db/custom.db"
Z_AI_API_KEY="your-z-ai-api-key"

# ---- Application ----
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_TELEMETRY_DISABLED=1

# ---- Authentication ----
SESSION_SECRET="change-me-to-a-32-char-random-string"
SESSION_MAX_AGE=604800
BCRYPT_ROUNDS=12

# ---- QuickBooks Integration ----
QUICKBOOKS_CLIENT_ID=""
QUICKBOOKS_CLIENT_SECRET=""
QUICKBOOKS_REDIRECT_URI=""
QUICKBOOKS_ENVIRONMENT="sandbox"

# ---- Xero Integration ----
XERO_CLIENT_ID=""
XERO_CLIENT_SECRET=""
XERO_REDIRECT_URI=""

# ---- Stripe Billing ----
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# ---- Encryption ----
ENCRYPTION_KEY=""
API_KEY_SALT=""

# ---- Rate Limiting ----
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT_MAX=60
RATE_LIMIT_DEFAULT_WINDOW=60000

# ---- Observability ----
LOG_LEVEL=info
LOG_FORMAT=json
SENTRY_DSN=""
```

---

## 6. Database Setup

### 6.1 SQLite (Development)

SQLite is the default database, requiring zero configuration:

```bash
# The database file is created at db/custom.db
# Set the connection string in .env
DATABASE_URL="file:./db/custom.db"

# Push schema to create all tables
bun run db:push

# Verify tables were created
bunx prisma studio  # Opens Prisma Studio at localhost:5555
```

### 6.2 PostgreSQL (Production)

#### Initial Setup

```bash
# Create the database
createdb gangniaga

# Set the connection string
DATABASE_URL="postgresql://gangniaga:password@localhost:5432/gangniaga"

# Generate Prisma client with PostgreSQL provider
# Update prisma/schema.prisma:
#   datasource db {
#     provider = "postgresql"
#     url      = env("DATABASE_URL")
#   }

# Create and apply migrations
bunx prisma migrate dev --name init

# For production deployments, use deploy:
bunx prisma migrate deploy
```

#### PostgreSQL Configuration

```sql
-- Recommended PostgreSQL settings for GangNiaga

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;

-- Memory (adjust based on available RAM)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET work_mem = '4MB';

-- WAL settings for write performance
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Query planning
ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();
```

### 6.3 Seed Data

On first registration, the system automatically creates:

- A **User** record with the owner role
- An **Organization** with a default name and slug
- A **Membership** linking the user to the organization with the `owner` role
- Sample **KPI** entries for the dashboard

No separate seed script is required — the `/api/auth/register` endpoint handles all initialization.

### 6.4 Migration Strategy

| Environment | Command | Behavior |
|-------------|---------|----------|
| Development | `bun run db:push` | Pushes schema directly (no migration files) |
| Development | `bunx prisma migrate dev` | Creates migration files and applies them |
| Staging | `bunx prisma migrate deploy` | Applies pending migrations without prompts |
| Production | `bunx prisma migrate deploy` | Applies pending migrations without prompts |

### 6.5 Database Backups

#### SQLite Backup

```bash
# Simple file copy (stop the server first for consistency)
cp db/custom.db db/backup/custom-$(date +%Y%m%d-%H%M%S).db

# Online backup using SQLite CLI
sqlite3 db/custom.db ".backup db/backup/custom-$(date +%Y%m%d).db"
```

#### PostgreSQL Backup

```bash
# Full database dump
pg_dump -U gangniaga -Fc gangniaga > backup/gangniaga-$(date +%Y%m%d).dump

# Restore from backup
pg_restore -U gangniaga -d gangniaga backup/gangniaga-20260304.dump

# Automated daily backup (cron)
0 2 * * * pg_dump -U gangniaga -Fc gangniaga | gzip > /backups/gangniaga-$(date +\%Y\%m\%d).dump.gz
```

---

## 7. SSL/TLS Configuration

### 7.1 Caddy (Recommended)

Caddy provides automatic HTTPS via Let's Encrypt with zero configuration:

```caddyfile
# Caddyfile
app.gangniaga.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.openai.com"
    }
}
```

### 7.2 Nginx

```nginx
server {
    listen 80;
    server_name app.gangniaga.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.gangniaga.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/app.gangniaga.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.gangniaga.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.3 SSL Certificate Renewal

```bash
# Let's Encrypt auto-renewal (certbot)
sudo certbot renew --dry-run    # Test renewal
sudo crontab -e                 # Add: 0 3 * * * certbot renew --quiet
```

---

## 8. Monitoring & Health Checks

### 8.1 Health Check Endpoint

The `/api/auth/session` endpoint serves as an implicit health check:

```bash
# Basic health check
curl -f http://localhost:3000/api/auth/session

# Expected response (200 OK):
# {"user":null,"organization":null}
```

### 8.2 Application Metrics

| Metric | How to Access | Description |
|--------|--------------|-------------|
| Observability Dashboard | `/observability` page | Agent events, token usage, error monitoring |
| Rate limit stats | `getRateLimitStats()` function | Active rate limit entries per endpoint |
| Database size | `ls -la db/custom.db` | SQLite file size |
| Memory usage | `process.memoryUsage()` | Node.js heap utilization |

### 8.3 Observability System

GangNiaga includes a built-in observability system accessible via the Observability page:

- **Event Dashboard** — Total events, by type, by status
- **Token Usage** — Total tokens, cost estimation, by agent, by request type
- **Distributed Traces** — Trace ID and span ID propagation
- **Error Monitoring** — Recent errors with severity, source, and message
- **Slow Operations** — Top 10 slowest operations

### 8.4 External Monitoring (Recommended)

| Tool | Purpose | Configuration |
|------|---------|---------------|
| Sentry | Error tracking and performance | Set `SENTRY_DSN` env var |
| Uptime Robot | Uptime monitoring | Monitor `https://your-domain.com/api/auth/session` |
| Prometheus + Grafana | Infrastructure metrics | Scrape Node.js metrics endpoint |
| Logtail / BetterStack | Log aggregation | Configure `LOG_FORMAT=json` |

### 8.5 Log Management

```bash
# Development logs are written to dev.log
bun run dev  # Output is tee'd to dev.log

# Production logs are written to server.log
bun run start  # Output is tee'd to server.log

# View recent logs
tail -f server.log

# Search for errors
rg "ERROR" server.log
rg "Unhandled" server.log
```

---

## 9. Backup Strategy

### 9.1 Backup Schedule

| Data | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| SQLite database | Daily | 30 days | File copy |
| PostgreSQL database | Daily | 90 days | `pg_dump` |
| Environment config | On change | Indefinite | Manual backup |
| User uploads | Daily | 90 days | S3 sync or rsync |
| Audit logs | Monthly archive | 1 year | Database export |

### 9.2 Automated Backup Script

```bash
#!/bin/bash
# backup.sh — GangNiaga automated backup script

set -euo pipefail

BACKUP_DIR="/backups/gangniaga"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Database backup
if [[ "$DATABASE_URL" == postgres* ]]; then
    # PostgreSQL
    pg_dump -Fc "$DATABASE_URL" | gzip > "$BACKUP_DIR/db_$TIMESTAMP.dump.gz"
else
    # SQLite
    sqlite3 db/custom.db ".backup $BACKUP_DIR/db_$TIMESTAMP.db"
    gzip "$BACKUP_DIR/db_$TIMESTAMP.db"
fi

# 2. Environment file backup
cp .env "$BACKUP_DIR/env_$TIMESTAMP.bak"

# 3. Clean up old backups
find "$BACKUP_DIR" -name "db_*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_*.bak" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: db_$TIMESTAMP.gz"
```

### 9.3 Disaster Recovery

| Scenario | RPO | RTO | Recovery Procedure |
|----------|-----|-----|--------------------|
| Database corruption | < 24 hours | < 4 hours | Restore from latest backup |
| Server failure | < 24 hours | < 2 hours | Deploy to new server, restore DB |
| Data center outage | < 24 hours | < 8 hours | Activate DR region |
| Accidental deletion | < 1 hour | < 1 hour | Restore specific records from backup |

### 9.4 Restore Procedure

```bash
# SQLite restore
gunzip -c /backups/gangniaga/db_20260304_020000.db.gz > db/custom.db

# PostgreSQL restore
gunzip -c /backups/gangniaga/db_20260304_020000.dump.gz | pg_restore -U gangniaga -d gangniaga

# Verify restore
bunx prisma studio  # Check data integrity
```

---

## 10. Scaling Considerations

### 10.1 Vertical Scaling (Single Instance)

| Resource | Small | Medium | Large |
|----------|-------|--------|-------|
| CPU | 2 cores | 4 cores | 8 cores |
| RAM | 4 GB | 8 GB | 16 GB |
| Disk | 50 GB SSD | 200 GB SSD | 500 GB SSD |
| Concurrent users | ~50 | ~200 | ~500 |

### 10.2 Horizontal Scaling (Multi-Instance)

When scaling beyond a single instance, the following changes are required:

#### Database

```
SQLite → PostgreSQL
  - SQLite does not support concurrent writes from multiple processes
  - PostgreSQL supports multiple connections with MVCC
  - Configure PgBouncer for connection pooling
```

#### Session Store

```
Cookie-based → Redis-backed sessions
  - In-memory rate limiting does not share state across instances
  - Use Redis for shared rate limit counters
  - Store session data in Redis for sticky-session independence
```

#### File Storage

```
Local filesystem → S3-compatible object storage
  - Uploads must be accessible from all instances
  - Use MinIO for self-hosted or AWS S3 for managed
```

### 10.3 Scaling Architecture

```
                    ┌──────────────┐
                    │  Load Balancer│
                    │  (Caddy/NLB)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴────┐ ┌────┴─────┐ ┌────┴─────┐
        │ Next.js  │ │ Next.js  │ │ Next.js  │
        │ Instance │ │ Instance │ │ Instance │
        │   #1     │ │   #2     │ │   #3     │
        └─────┬────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴───────┐
                    │  PgBouncer   │
                    │ (Pooler)     │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  PostgreSQL  │
                    │  Primary     │
                    │  + Replica   │
                    └──────────────┘
                           │
                    ┌──────┴───────┐
                    │    Redis     │
                    │ (Sessions/   │
                    │  Rate Limits)│
                    └──────────────┘
```

### 10.4 Performance Targets by Scale

| Scale | Users | API req/min | Agent tasks/min | Infrastructure |
|-------|-------|-------------|-----------------|----------------|
| Small | 100 | 1,000 | 50 | 1 instance, SQLite |
| Medium | 1,000 | 5,000 | 200 | 3 instances, PostgreSQL, Redis |
| Large | 10,000 | 50,000 | 2,000 | 10 instances, PostgreSQL cluster, Redis cluster, CDN |

---

## 11. Troubleshooting

### 11.1 Common Issues

#### Application Won't Start

| Symptom | Cause | Solution |
|---------|-------|----------|
| `MODULE_NOT_FOUND` | Dependencies not installed | Run `bun install` |
| `P1001: Can't reach database server` | DATABASE_URL incorrect | Check `.env` file and database connectivity |
| `EADDRINUSE: port 3000 already in use` | Port conflict | Change `PORT` env var or kill existing process |
| `PrismaClient is unable to run in edge runtime` | Prisma in middleware | Prisma only works in Node.js runtime, not Edge |

#### Database Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `SQLITE_BUSY: database is locked` | Concurrent writes to SQLite | Switch to PostgreSQL or reduce concurrent writes |
| `P2002: Unique constraint failed` | Duplicate data | Check for existing records before creating |
| `P2025: Record not found` | Missing required relation | Ensure referenced records exist before creating |
| Schema drift | Manual database changes | Run `bun run db:push` to sync |

#### Authentication Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Authentication required` on all endpoints | No `session_user` cookie | Login via `/api/auth/login` first |
| `No active organization membership` | User has no org membership | Register a new account (creates org automatically) |
| Rate limit hit on login | Too many login attempts | Wait 60 seconds or reset rate limit |

#### AI Agent Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Agent returns empty response | z-ai-web-dev-sdk API key missing | Set `Z_AI_API_KEY` in `.env` |
| Agent task stuck in `running` | LLM timeout | Check network connectivity, increase timeout |
| Tool execution fails | Agent doesn't have permission | Check `AgentPermission` table for agent's allowed tools |
| Memory not persisted | Memory engine error | Check database connectivity |

### 11.2 Diagnostic Commands

```bash
# Check Node.js version
node --version

# Check Bun version
bun --version

# Check database connectivity (SQLite)
sqlite3 db/custom.db "SELECT count(*) FROM users;"

# Check database connectivity (PostgreSQL)
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"

# Check Prisma client generation
bunx prisma generate

# Validate Prisma schema
bunx prisma validate

# View Prisma schema diff
bunx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma

# Check running processes on port 3000
lsof -i :3000

# Test API endpoint
curl -s http://localhost:3000/api/auth/session | jq .

# View recent application logs
tail -100 server.log

# Check rate limit state (via API)
curl -s http://localhost:3000/api/auth/session -D - | rg -i "x-ratelimit"
```

### 11.3 Emergency Procedures

#### Database Recovery

```bash
# Stop the application
pkill -f "server.js" || docker compose stop app

# Backup current (potentially corrupted) database
cp db/custom.db db/custom.corrupted.db

# Restore from latest backup
gunzip -c /backups/gangniaga/db_latest.gz > db/custom.db

# Restart the application
bun run start || docker compose start app
```

#### Complete Application Reset

```bash
# ⚠️ WARNING: This deletes all data

# Stop the application
pkill -f "server.js" || docker compose down

# Remove database
rm db/custom.db

# Recreate database with schema
bun run db:push

# Start the application
bun run start || docker compose up -d
```

---

*For additional support, consult the Architecture Document (ARCHITECTURE.md) and API Reference (API.md).*
