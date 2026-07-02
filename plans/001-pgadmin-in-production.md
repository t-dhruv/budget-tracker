# Plan 001: Add pgAdmin to production Docker Compose

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat bac55eae..HEAD -- docker/prod/docker-compose.yml docker/prod/docker-compose.localhost.yml .env.production.example docs/self-hosting.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `bac55eae`, 2026-07-06

## Why this matters

Self-hosters running the prod stack have zero database GUI — they must SSH-tunnel and use `psql`. The dev stack already includes pgAdmin (same image). Adding it to the prod compose behind a Docker Compose profile means operators can `docker compose --profile admin up pgadmin` when they need a visual query tool, without exposing it permanently.

## Current state

**Dev compose** (`docker/dev/docker-compose.yml:83-90`) already has pgAdmin:

```yaml
pgadmin:
    image: dpage/pgadmin4:8.11
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}
      - PGADMIN_LISTEN_PORT=${PGADMIN_LISTEN_PORT}
    ports: ['${MAP_PGADMIN_PORT_TO_OS_PORT:-8001}:${PGADMIN_LISTEN_PORT:-8001}']
    depends_on: ['db']
    attach: false
```

**Prod compose** (`docker/prod/docker-compose.yml`) has no pgAdmin. It uses Docker Compose profiles (`selfhost` network only). No optional services pattern exists yet.

**Env template** (`.env.template:57-60`) has pgAdmin vars:

```
PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=password
PGADMIN_LISTEN_PORT=8001
```

**Prod env example** (`.env.production.example`) has NO pgAdmin vars.

**Self-hosting docs** (`docs/self-hosting.md`) list only `db`, `redis`, `currency-rates-api` as stateful services — no mention of an admin UI.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Config check | `docker compose -f docker/prod/docker-compose.yml config` | exit 0, pgadmin service present under the `admin` profile |
| Build check | `docker compose -f docker/prod/docker-compose.yml build pgadmin` | exit 0 |
| Git status | `git status` | only in-scope files modified |

## Scope

**In scope** (only files to modify):
- `docker/prod/docker-compose.yml` — add pgadmin service behind a profile
- `.env.production.example` — add pgAdmin env vars (commented-out, optional)
- `docs/self-hosting.md` — add pgAdmin section to environment variable reference

**Out of scope** (do NOT touch):
- `docker/dev/docker-compose.yml` — dev already has pgAdmin; no change needed
- `docker/prod/docker-compose.localhost.yml` — override for local testing; pgAdmin does not need an override here
- Any backend or frontend source code
- The `db` service definition or its healthcheck
- Dockerfiles or entrypoint scripts

## Git workflow

- Branch: `advisor/001-pgadmin-prod`
- Commit as a single logical change: `feat: add optional pgAdmin service to prod compose`
- Do NOT push or open a PR

## Steps

### Step 1: Add pgAdmin service to production compose

Edit `docker/prod/docker-compose.yml`. Add a new `pgadmin` service after the `currency-rates-api` service (before the `networks:` and `volumes:` blocks at the bottom).

Pattern: use a Docker Compose profile named `admin` so pgAdmin is opt-in:

```yaml
  pgadmin:
    profiles: ['admin']
    image: dpage/pgadmin4:8.11
    restart: unless-stopped
    networks: [selfhost]
    ports: ['127.0.0.1:${PGADMIN_HOST_PORT:-8001}:${PGADMIN_LISTEN_PORT:-8001}']
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL:-admin@admin.com}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD:-password}
      - PGADMIN_LISTEN_PORT=${PGADMIN_LISTEN_PORT:-8001}
    depends_on: [db]
    logging: *default-logging
```

Key details:
- `profiles: ['admin']` ensures pgAdmin is NOT started by `docker compose up -d`. The operator must explicitly run `docker compose --profile admin up -d pgadmin`.
- Bind to `127.0.0.1` only (same pattern as db/redis host ports) — no external exposure.
- Use `*default-logging` from the `x-logging` anchor already defined at the top of the file.
- Default values inline so the vars are optional (matching `redis` pattern).

**Verify**: `docker compose -f docker/prod/docker-compose.yml config --profile admin` → exits 0, output includes `pgadmin` with `image: dpage/pgadmin4:8.11`.

### Step 2: Add env var docs to .env.production.example

Edit `.env.production.example`. Add pgAdmin vars to the `=== OPTIONAL ===` section, after the Passkeys block (around line 108, before the `=== ADVANCED ===` section):

```env
# --- Admin UI — pgAdmin (optional, requires `--profile admin` on compose) ---
# PGADMIN_DEFAULT_EMAIL=admin@admin.com
# PGADMIN_DEFAULT_PASSWORD=__REPLACE_ME__
# PGADMIN_HOST_PORT=8001
# PGADMIN_LISTEN_PORT=8001
```

All commented out since the feature is optional.

**Verify**: `grep -n 'PGADMIN' .env.production.example` → shows the 4 new lines.

### Step 3: Document in self-hosting guide

Edit `docs/self-hosting.md`. Two changes:

**3a.** Add pgAdmin to the "Optional" table in the env reference, after the WebAuthn/passkey row (line 406):

```
| `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` | pgAdmin web UI (opt-in via `--profile admin`) |
```

**3b.** Add a usage note in the Backups section (line 331) or as a new subsection #9.5 between Backups and Localhost testing:

```markdown
### 9.5 pgAdmin (optional admin UI)

Start pgAdmin alongside the stack to browse the database via a web GUI:

```bash
docker compose --env-file .env.production \
  -f docker/prod/docker-compose.yml \
  --profile admin up -d pgadmin
```

pgAdmin is bound to `127.0.0.1:8001` — access it through an SSH tunnel
(`ssh -L 8001:localhost:8001 user@vps`). Log in with `PGADMIN_DEFAULT_EMAIL`
and `PGADMIN_DEFAULT_PASSWORD` from your `.env.production`. Register the
database server:

| Field       | Value                      |
|-------------|----------------------------|
| Host        | `db`                       |
| Port        | 5432                       |
| Username    | `$APPLICATION_DB_USERNAME` |
| Password    | `$APPLICATION_DB_PASSWORD` |
```

**Verify**: `grep -c 'pgAdmin' docs/self-hosting.md` → returns ≥2 matches (table row + subsection).

## Test plan

This is a Docker Compose configuration change — no code tests. Manual verification:

1. `docker compose -f docker/prod/docker-compose.yml config --profile admin` — pgAdmin should appear in the composed output.
2. `docker compose -f docker/prod/docker-compose.yml config` (no profile) — pgAdmin should NOT appear.
3. Build the image (no-op, it's pulled): `docker pull dpage/pgadmin4:8.11` — exits 0.

## Done criteria

- [ ] `docker compose -f docker/prod/docker-compose.yml config --profile admin` exits 0 and includes pgadmin
- [ ] `docker compose -f docker/prod/docker-compose.yml config` (no profile) does NOT include pgadmin
- [ ] `.env.production.example` has 4 commented pgAdmin vars
- [ ] `docs/self-hosting.md` has a pgAdmin subsection and an env table entry
- [ ] `git status` shows only the 3 in-scope files modified
- [ ] No `.env.production` or `.env.development` files modified (those are local)

## STOP conditions

- The prod compose file structure has changed significantly (e.g., logging anchor renamed or networks section restructured) — stop and report.
- The `dpage/pgadmin4:8.11` tag used in dev compose has changed — prefer the latest 8.x tag from dev compose, not the fixed version in this plan.
- Any in-scope file shows uncommitted unrelated changes that would be mixed in.

## Maintenance notes

- When bumping pgAdmin in dev compose, bump the same tag in prod.
- The `admin` profile pattern can be reused for other opt-in admin tools (Redis Commander, plan 002, would use the same profile).
- If security requirements tighten, add an `AUTH_ORIGIN`-based auth proxy in front of pgAdmin instead of relying on SSH-tunnel-only access.
