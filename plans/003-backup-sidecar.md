# Plan 003: Add automated database backup sidecar to production stack

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bac55eae..HEAD -- docker/prod/ docker/prod/docker-compose.yml .env.production.example docs/self-hosting.md .gitignore`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `bac55eae`, 2026-07-06

## Why this matters

The prod stack has no local backup automation. The only backup runs via GitHub Actions (`database-backup.yml`) — it SSHes into the maintainer's VPS, runs `pg_dump`, and uploads to Cloudflare R2. This means:
1. Self-hosted users (the project's target audience) have zero automated backups.
2. Even the maintainer's backup breaks if GitHub Actions is down or the SSH key expires.
3. No local backup file to quickly restore from — every restore requires downloading from R2 (`scripts/restore-backup.sh`).

A sidecar container that runs `pg_dump` on a cron schedule fills this gap. It writes to a Docker volume on the host, making backups available locally for fast restore and optionally syncable to external storage. Fed by the same env vars the backend uses.

## Current state

**Prod compose** (`docker/prod/docker-compose.yml`) has a `db` service (Postgres 16) with healthcheck and associated `db_data` volume. No backup mechanism.

**Self-hosting docs** (`docs/self-hosting.md:331-350`) has a manual `pg_dump` command:

```bash
docker compose -f docker/prod/docker-compose.yml exec -T db \
  pg_dump -U "$APPLICATION_DB_USERNAME" "$APPLICATION_DB_DATABASE" \
  | gzip > "backup-$(date +%F).sql.gz"
```

**CI backup** (`.github/workflows/database-backup.yml`) runs on the VPS via SSH, does `pg_dump` + gzip, validates size > 100 bytes, uploads to Cloudflare R2, and cleans files older than 60 days.

**GitHub Actions workflow** (`.github/workflows/image-to-docker-hub.yml:12-17`) triggers the CI backup before deployments.

**Restore script** (`scripts/restore-backup.sh`) handles both local file and R2 download restore.

**.gitignore** already has `db-dumps` and `packages/backend/db-backups` as gitignored patterns.

**No local backup service or script** exists for automated scheduled backups.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Config | `docker compose -f docker/prod/docker-compose.yml config` | exit 0, includes db-backup |
| Build | `docker compose -f docker/prod/docker-compose.yml build db-backup` | exit 0 |
| Git status | `git status` | only in-scope files modified |

## Scope

**In scope** (files to create or modify):
- `docker/prod/backup/Dockerfile` — create
- `docker/prod/backup/backup.sh` — create
- `docker/prod/docker-compose.yml` — add db-backup service + backup volume
- `.env.production.example` — add backup env vars
- `.env.template` — add backup env vars (for dev parity if desired)
- `docs/self-hosting.md` — document the backup sidecar
- `.gitignore` — add `docker/prod/backup/backups/` or the backup mount path

**Out of scope**:
- `scripts/restore-backup.sh` — already works, no changes needed
- `.github/workflows/database-backup.yml` — CI backup is complementary, not replaced
- `docker/dev/docker-compose.yml` — dev can use the same pattern but out of scope for this plan
- The existing `scripts/` directory — backup sidecar is a new approach, not a replacement for existing scripts
- Any backend or frontend source code
- Cloudflare R2 upload from the sidecar (future improvement; CI backup already handles this)

## Conventions to follow

This project uses the following conventions (gathered from existing `docker/prod/` files):

- **Dockerfiles**: multi-stage when building, single-stage when just installing packages. Alpine base. `set -e` in shell scripts.
- **Entrypoints**: shell scripts with `set -e`, env var guards, then `exec "$@"`.
- **Compose styles**: YAML anchors for shared config (`x-logging: &default-logging`). `restart: unless-stopped`. `networks: [selfhost]`. `logging: *default-logging`.
- **Env vars**: uppercase underscore convention (`APPLICATION_DB_USERNAME`, `BACKUP_RETENTION_DAYS`).
- **Healthchecks**: HTTP/TCP checks where possible, `CMD-SHELL` for pg.

## Git workflow

- Branch: `advisor/003-backup-sidecar`
- Commits: one per logically grouped step (Step 1 = one commit, Steps 2-3 = one commit, Steps 4-5 = one commit)
- Message style: conventional commits, e.g. `feat: add db-backup sidecar container`, `docs: document backup sidecar in self-hosting guide`
- Do NOT push or open a PR

## Steps

### Step 1: Create backup Dockerfile

Create `docker/prod/backup/Dockerfile`:

```dockerfile
FROM alpine:3.20

RUN apk add --no-cache postgresql-client dcron bash

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Create backup directory
RUN mkdir -p /backups

# Environment variables with defaults
ENV PG_HOST=db \
    PG_PORT=5432 \
    BACKUP_SCHEDULE="0 4 * * *" \
    BACKUP_RETENTION_DAYS=30

# Install the cron job
RUN echo "$BACKUP_SCHEDULE /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /var/spool/cron/crontabs/root

# Start cron and tail log
CMD ["sh", "-c", "crond -b -l 2 && touch /var/log/backup.log && tail -f /var/log/backup.log"]
```

Key design choices:
- Alpine 3.20 — small (~15MB with pg_dump).
- `postgresql-client` provides `pg_dump` (not the full postgres server).
- `dcron` is Alpine's minimal cron daemon.
- Default schedule: daily at 4 AM.
- Default retention: 30 days.
- Crontab entry runs backup.sh and appends to a log file.
- Container stays alive by `tail -f` on the log.

### Step 2: Create backup script

Create `docker/prod/backup/backup.sh`:

```bash
#!/bin/sh
set -e

PG_HOST="${PG_HOST:-db}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${APPLICATION_DB_USERNAME}"
PG_DB="${APPLICATION_DB_DATABASE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DIR="/backups"

# Timestamp for the backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup to ${BACKUP_FILE}..."

# Create dump with pg_dump (same flags as CI backup: --no-owner --no-acl)
pg_dump \
    -h "$PG_HOST" \
    -p "$PG_PORT" \
    -U "$PG_USER" \
    -d "$PG_DB" \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_FILE"

# Validate backup is not empty (empty gzip is ~20 bytes)
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
if [ "$BACKUP_SIZE" -lt 100 ]; then
    echo "[$(date)] ERROR: Backup file is too small (${BACKUP_SIZE} bytes), pg_dump likely failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo "[$(date)] Backup created: $(basename ${BACKUP_FILE}) ($(ls -lh ${BACKUP_FILE} | awk '{print $5}'))"

# Rotate old backups
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name 'db_backup_*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] Backup completed successfully"
```

Design notes:
- Uses same `pg_dump` flags as the CI backup (`--no-owner --no-acl`) — consistent dumps.
- Validates backup size > 100 bytes (same check as `database-backup.yml:75`).
- Rotates old backups based on file modification time.
- Outputs to `/backups/` directory (a Docker volume).

### Step 3: Add backup service to production compose

Edit `docker/prod/docker-compose.yml`. Three changes:

**3a.** Add a new volume to the `volumes:` block at the bottom:

```yaml
  db_backups:
```

Insert before the final closing `}` of the volumes block. The block currently reads:

```yaml
volumes:
  db_data:
  redis_data:
  currency_rates_data:
```

Add `db_backups:` after `db_data:`.

**3b.** Add the `db-backup` service. Insert after the `db` service block (after line 87), before the `redis` service:

```yaml
  db-backup:
    build:
      context: ../../
      dockerfile: docker/prod/backup/Dockerfile
    restart: unless-stopped
    networks: [selfhost]
    volumes:
      - db_backups:/backups
    environment:
      - PG_HOST=db
      - PG_PORT=5432
      - PG_USER=${APPLICATION_DB_USERNAME}
      - PG_DB=${APPLICATION_DB_DATABASE}
      - BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-0 4 * * *}
      - BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
    depends_on:
      db: { condition: service_healthy }
    logging: *default-logging
```

Key details:
- `build.context` from repo root (same as other services).
- `networks: [selfhost]` — can reach `db` by hostname.
- `db_backups` volume — persisted on the host; backups survive container restarts.
- Depends on `db` healthcheck — won't run a backup against an unhealthy DB.
- `*default-logging` — consistent with other services.

**3c.** Ensure the `db-backup` service is listed in the `backend`'s `depends_on` is NOT changed — the backend doesn't need the backup service to run. No dependency change needed for `backend`.

**Verify**: `docker compose -f docker/prod/docker-compose.yml config` → exits 0, output includes `db-backup` with build config, environment, and volumes.

### Step 4: Add env vars to templates

**4a.** Edit `.env.production.example`. Add to the `=== OPTIONAL ===` section (after ADVANCED port overrides at the bottom, around line 129):

```env
# --- Automated database backups ---
# Schedule in cron format (default: 4 AM daily). Retention in days.
# BACKUP_SCHEDULE=0 4 * * *
# BACKUP_RETENTION_DAYS=30
```

All commented out since defaults are reasonable.

**4b.** Edit `.env.template`. Add near the database section (around line 12, after `APPLICATION_DB_DIALECT`):

```env
# Automated database backup (sidecar container)
BACKUP_RETENTION_DAYS=30
# BACKUP_SCHEDULE=0 4 * * *  # Default: daily at 4 AM
```

**Verify**: `grep -c 'BACKUP_' .env.production.example .env.template` → ≥2 matches across both files.

### Step 5: Document in self-hosting guide

Edit `docs/self-hosting.md`. Replace the manual backup section (lines 331-350, currently the "Backups" section #9) with an expanded version:

**5a.** Update the intro (line 333) — Redis note stays the same:

```markdown
## 9. Backups

The two stateful volumes are `db_data` (Postgres) and `redis_data` (Redis).
Redis is queue-only – data is regenerated on the fly, so back up Postgres
only. The production stack includes an optional automated backup sidecar.
```

**5b.** Add the automated backup subsection:

```markdown
### 9.1 Automated backup (recommended)

The `db-backup` sidecar runs `pg_dump` on a cron schedule and saves
compressed dumps to a Docker volume (`db_backups`). It starts automatically
with the stack.

**Configuration** (set in `.env.production`):

| Variable                | Default      | Description                              |
|-------------------------|--------------|------------------------------------------|
| `BACKUP_SCHEDULE`       | `0 4 * * *`  | Cron expression (daily at 4 AM)          |
| `BACKUP_RETENTION_DAYS` | `30`         | Remove backups older than N days          |

**Manual trigger**:

```bash
docker compose -f docker/prod/docker-compose.yml exec db-backup backup.sh
```

**List backups**:

```bash
docker compose -f docker/prod/docker-compose.yml exec db-backup ls -lh /backups
```

**Copy a backup off the host**:

```bash
docker cp budget-tracker-prod-db-backup-1:/backups/db_backup_20260706_040000.sql.gz .
```

**Restore from a local backup** (using existing script):

```bash
./scripts/restore-backup.sh /path/to/db_backup_20260706_040000.sql.gz
```

**Restore from R2** (maintainer CI backups):

```bash
./scripts/restore-backup.sh
```
```

**5c.** Keep the manual backup command as a subsection (renamed to 9.2):

```markdown
### 9.2 Manual one-shot backup

```bash
# Requires credentials to be set in .env.production
docker compose -f docker/prod/docker-compose.yml exec -T db \
  pg_dump -U "$APPLICATION_DB_USERNAME" "$APPLICATION_DB_DATABASE" \
  | gzip > "backup-$(date +%F).sql.gz"
```
```

**5d.** Renumber the old restore section (was inline, now 9.3; also renumber the following section from 10 to 10):

```markdown
### 9.3 Restore

gunzip -c backup-2026-05-01.sql.gz | \
  docker compose -f docker/prod/docker-compose.yml exec -T db \
  psql -U "$APPLICATION_DB_USERNAME" "$APPLICATION_DB_DATABASE"
```

(Note: the existing restore command in the doc stays — just renumber the heading.)

**5e.** Add a note in the vol env reference table (around line 388-389) for the backup vars:

```
| `BACKUP_SCHEDULE`, `BACKUP_RETENTION_DAYS` | Automated DB backup schedule & retention |
```

**Verify**: `grep -c 'db-backup\|BACKUP_' docs/self-hosting.md` → at least 3 matches.

## Test plan

1. **Build**: `docker compose -f docker/prod/docker-compose.yml build db-backup` → exit 0.
2. **Config**: `docker compose -f docker/prod/docker-compose.yml config` → includes `db-backup` with build + env + volumes.
3. **Script syntax**: `bash -n docker/prod/backup/backup.sh` → no syntax errors.
4. **Dockerfile check**: `docker run --rm -it $(docker build -q -f docker/prod/backup/Dockerfile .) /bin/sh -c "pg_dump --version && crond -V"` → shows version output, exits 0.
5. **Full stack integration** (if running the stack): after `docker compose -f docker/prod/docker-compose.yml up -d`, wait for health, then `docker compose exec db-backup backup.sh` → creates a `.sql.gz` file in `/backups/`, size > 100 bytes.

## Done criteria

- [ ] `docker compose -f docker/prod/docker-compose.yml config` includes `db-backup` with correct build context, env, and volumes
- [ ] `docker compose -f docker/prod/docker-compose.yml build db-backup` exits 0
- [ ] `bash -n docker/prod/backup/backup.sh` exits 0
- [ ] `.env.production.example` has `BACKUP_SCHEDULE` and `BACKUP_RETENTION_DAYS` (commented)
- [ ] `.env.template` has `BACKUP_RETENTION_DAYS`
- [ ] `docs/self-hosting.md` section 9 is restructured with automated backup docs
- [ ] `git status` shows only the 7 in-scope files created/modified (3 new, 4 modified)
- [ ] `.gitignore` covers any paths that might contain live backup data (verify `db-dumps` and `packages/backend/db-backups` entries already cover the pattern)

## STOP conditions

- If Alpine 3.20's `postgresql-client` package doesn't include `pg_dump` ≥ 16 (same major version as the DB), stop and report — the dump format may be incompatible.
- If the `db` service's Postgres version in prod compose (`image: postgres:16`) doesn't match what `pg_dump` from `postgresql-client` can handle — stop and report.
- If the compose file structure or logging anchor changes significantly.
- If any in-scope file has unrelated uncommitted changes.

## Maintenance notes

- When bumping Postgres version in the `db` service, also check that `postgresql-client` in the backup Dockerfile provides a compatible `pg_dump`. The minor version can differ (pg_dump is backward-compatible within the same major version).
- The CI backup (`database-backup.yml`) is complementary, not replaced. It handles R2 upload and pre-deployment safety. The sidecar handles local schedule and self-hosted users.
- If adding encryption (GPG) or R2 upload to the sidecar in the future, the `backup.sh` script is the extension point — add a POST_BACKUP_HOOK env var.
- The backup log is available via `docker compose logs db-backup`.
- `db_backups` volume location on the host: `docker volume inspect budget-tracker-prod_db_backups`. To change it, add a `driver_opts` or use a bind mount override in a local override compose file.
