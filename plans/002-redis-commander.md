# Plan 002: Add Redis Commander to dev and production Docker Compose

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bac55eae..HEAD -- docker/dev/docker-compose.yml docker/prod/docker-compose.yml docker/dev/README.md .env.template .env.production.example docs/self-hosting.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but logically grouped with plan 001 — same `admin` profile on prod)
- **Category**: direction
- **Planned at**: commit `bac55eae`, 2026-07-06

## Why this matters

Redis is used for BullMQ queues and sync status tracking, but there's no way to inspect keys, monitor queue depth, or debug stalled jobs without `redis-cli`. Redis Commander provides a lightweight web UI (5MB image) with read-only mode support. Adding it to dev is always-on; prod uses the same `admin` profile pattern as plan 001's pgAdmin.

## Current state

**Dev compose** (`docker/dev/docker-compose.yml`) has a `redis` service (lines 53-56) but no admin UI:

```yaml
redis:
    image: redis:7
    volumes: ['redis_data:/data']
    ports: ['${MAP_REDIS_PORT_TO_OS_PORT:-6379}:6379']
```

**Prod compose** (`docker/prod/docker-compose.yml`:89-99) has the same `redis` service with a healthcheck:

```yaml
redis:
    image: redis:7
    restart: unless-stopped
    networks: [selfhost]
    volumes: ['redis_data:/data']
    ports: ['127.0.0.1:${REDIS_HOST_PORT:-6379}:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5
```

**Dev README** (`docker/dev/README.md:6-12`) lists services — no Redis UI mentioned.

**Env template** (`.env.template`) has `APPLICATION_REDIS_HOST=redis` and `MAP_REDIS_PORT_TO_OS_PORT=6380` but no Redis Commander port mapping.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Config (dev) | `docker compose -f docker/dev/docker-compose.yml config` | exit 0, redis-commander present |
| Config (prod) | `docker compose -f docker/prod/docker-compose.yml config --profile admin` | exit 0, redis-commander present |
| Git status | `git status` | only in-scope files modified |

## Scope

**In scope**:
- `docker/dev/docker-compose.yml` — add redis-commander service
- `docker/prod/docker-compose.yml` — add redis-commander service behind `admin` profile
- `docker/dev/README.md` — update service list
- `.env.template` — add `MAP_REDIS_COMMANDER_PORT_TO_OS_PORT`
- `.env.production.example` — add commented Redis Commander vars
- `docs/self-hosting.md` — add env reference entry

**Out of scope**:
- `docker/prod/docker-compose.localhost.yml`
- Any backend or frontend source code
- Changes to `redis` service config (no auth, no persistence changes)

## Git workflow

- Branch: `advisor/002-redis-commander`
- Commit: `feat: add Redis Commander to dev and prod compose`
- Do NOT push or open a PR

## Steps

### Step 1: Add Redis Commander to dev compose

Edit `docker/dev/docker-compose.yml`. Add a new `redis-commander` service after the `redis` service block (after line 56, before the `currency-rates-api` service):

```yaml
redis-commander:
    image: rediscommander/redis-commander:latest
    restart: unless-stopped
    environment:
      - REDIS_HOSTS=local:${APPLICATION_REDIS_HOST:-redis}:6379
      - PORT=${REDIS_COMMANDER_PORT:-8081}
    ports: ['${MAP_REDIS_COMMANDER_PORT_TO_OS_PORT:-8081}:${REDIS_COMMANDER_PORT:-8081}']
    depends_on: ['redis']
    attach: false
```

Key details:
- `REDIS_HOSTS` env var tells Redis Commander which Redis to connect to. Format: `label:host:port`.
- `attach: false` matches the pattern of `pgadmin` and `currency-rates-api` — no log noise in dev.
- Default port 8081, overridable via `MAP_REDIS_COMMANDER_PORT_TO_OS_PORT`.

**Verify**: `docker compose -f docker/dev/docker-compose.yml config` → output includes `redis-commander` with the configured env vars.

### Step 2: Add Redis Commander to prod compose

Edit `docker/prod/docker-compose.yml`. Add after the `redis` service (after line 99), before `currency-rates-api`:

```yaml
  redis-commander:
    profiles: ['admin']
    image: rediscommander/redis-commander:latest
    restart: unless-stopped
    networks: [selfhost]
    ports: ['127.0.0.1:${REDIS_COMMANDER_HOST_PORT:-8081}:8081']
    environment:
      - REDIS_HOSTS=local:redis:6379
      - PORT=8081
    depends_on: [redis]
    logging: *default-logging
```

Key differences from dev:
- `profiles: ['admin']` — opt-in only (same profile as pgAdmin in plan 001)
- `networks: [selfhost]` — internal Docker network
- `127.0.0.1` bind — SSH-tunnel access only
- `*default-logging` — consistent with other services

**Verify**: `docker compose -f docker/prod/docker-compose.yml config --profile admin` → exits 0, includes `redis-commander`.

**Verify (no profile)**: `docker compose -f docker/prod/docker-compose.yml config` → does NOT include `redis-commander`.

### Step 3: Update dev README service list

Edit `docker/dev/README.md`. Change the services bullet list (lines 6-12) to add:

```
- **redis-commander**: Redis web UI (port 8081)
```

Insert after the `redis` line, before `currency-rates-api`.

**Verify**: `grep -q 'redis-commander' docker/dev/README.md` → exits 0.

### Step 4: Add env vars to templates

**4a.** Edit `.env.template`. After the `MAP_REDIS_PORT_TO_OS_PORT` line (line 16), add:

```
# Redis Commander port mapping
MAP_REDIS_COMMANDER_PORT_TO_OS_PORT=8081
```

Also add after the Redis section in the frontend envs block, or wherever makes sense contextually.

**4b.** Edit `.env.production.example`. Add to the `=== OPTIONAL ===` section (after the pgAdmin vars from plan 001 if present, or in the ADVANCED section near the other port overrides):

```env
# --- Admin UI — Redis Commander (optional, requires `--profile admin` on compose) ---
# REDIS_COMMANDER_HOST_PORT=8081
```

**Verify**: `grep -c 'REDIS_COMMANDER' .env.template .env.production.example` → at least 1 match in each file.

### Step 5: Document in self-hosting guide

Edit `docs/self-hosting.md`. Add a line to the "Optional" env table (after the pgAdmin row from plan 001, or near the Redis entry at line 388):

```
| `REDIS_COMMANDER_HOST_PORT` | Redis Commander web UI port (opt-in via `--profile admin`) |
```

**Verify**: `grep -c 'Redis Commander' docs/self-hosting.md` → ≥1 match.

## Test plan

Docker Compose config change — manual verification:

1. Dev: `docker compose -f docker/dev/docker-compose.yml config | grep redis-commander` → service present.
2. Prod + profile: `docker compose -f docker/prod/docker-compose.yml config --profile admin | grep redis-commander` → service present.
3. Prod no profile: `docker compose -f docker/prod/docker-compose.yml config | grep -c redis-commander` → 0 (not present).
4. Image pull: `docker pull rediscommander/redis-commander:latest` → exits 0.

## Done criteria

- [ ] `docker compose -f docker/dev/docker-compose.yml config` includes redis-commander
- [ ] `docker compose -f docker/prod/docker-compose.yml config --profile admin` includes redis-commander
- [ ] `docker compose -f docker/prod/docker-compose.yml config` (no profile) does NOT include redis-commander
- [ ] `grep -c 'redis-commander' docker/dev/README.md` → ≥1 match
- [ ] `.env.template` has `MAP_REDIS_COMMANDER_PORT_TO_OS_PORT`
- [ ] `.env.production.example` has `REDIS_COMMANDER_HOST_PORT` (commented)
- [ ] `docs/self-hosting.md` has a Redis Commander env table entry
- [ ] `git status` shows only the 6 in-scope files modified

## STOP conditions

- If `rediscommander/redis-commander:latest` image doesn't exist or has breaking changes — stop and suggest an alternative image like `redisinsight/redisinsight:latest` (heavier but official).
- If the prod compose networking or logging anchor structure has changed significantly.
- If any in-scope file has unrelated uncommitted changes.

## Maintenance notes

- Redis Commander has no auth by default. In prod it's bound to `127.0.0.1` (SSH tunnel only). If exposing more broadly, add `REDIS_HOST_PASSWORD` or put behind an auth proxy.
- The `admin` Docker Compose profile is shared with pgAdmin. Starting both: `docker compose --profile admin -f ... up -d pgadmin redis-commander`.
- The `attach: false` in dev means logs aren't shown by default. Run `npm run docker:dev:logs` to see them.
