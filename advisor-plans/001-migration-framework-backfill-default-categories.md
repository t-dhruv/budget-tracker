# Plan 001: Migration framework for backfilling new default categories to existing users

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 5a6cea81..HEAD -- packages/backend/src/migrations/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (blocker for plans 002 and 003)
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `5a6cea81`, 2026-07-08

## Why this matters

Default categories are only seeded at signup (`create-user-with-defaults.service.ts:80-180`). When the taxonomy in `default-categories.ts` is expanded with new categories, existing users never receive them. Every new category must be manually created by every existing user — or a migration must backfill them. Without a reusable migration pattern, each taxonomy update requires a hand-rolled SQL migration. This plan builds the reusable pattern so plans 002, 003, and all future taxonomy updates have a standard way to reach existing users.

## Current state

**Seed-at-signup only** — `packages/backend/src/services/user/create-user-with-defaults.service.ts:80-180`:
- Calls `getTranslatedCategories({ locale })` to get localized category names
- `bulkCreate`s all main categories, then all subcategories
- Only runs once per user during signup

**No existing-user backfill exists** — the only category migration (`20260506000000-add-key-to-categories.ts`) backfilled the `key` column onto existing rows — it did NOT insert new rows.

**Migration convention** — per `20260506000000-add-key-to-categories.ts:20-24`:
> Per project convention migrations are frozen history and cannot import from `src/services` or `src/common` (the prod Docker image only ships `src/migrations`).

This means the migration must inline its data and use raw SQL via `QueryInterface`.

**Existing migration pattern** — `20260506000000-add-key-to-categories.ts:403-477` shows the template:
```typescript
module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const t = await queryInterface.sequelize.transaction();
    try {
      // ... raw SQL using queryInterface.sequelize.query(...)
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
  down: async (queryInterface: QueryInterface): Promise<void> => { /* ... */ },
};
```

**Category model** — `packages/backend/src/models/categories.model.ts:16-57`:
```
Columns: id (UUID PK), name (STRING, not null), key (STRING(100), nullable, stable kebab-case),
icon (STRING(50), nullable, Lucide icon name), color (STRING, not null),
type (ENUM: custom|internal), parentId (UUID, FK self), userId (INTEGER, FK users)
```

**Seed categories use `key`** — `packages/backend/src/common/const/default-categories.ts:22-34`:
```typescript
const CATEGORY_KEYS = Object.freeze({
  food: 'food', shopping: 'shopping', housing: 'housing',
  transportation: 'transportation', vehicle: 'vehicle', life: 'life',
  communication: 'communication', financialExpenses: 'financial-expenses',
  investments: 'investments', income: 'income', other: 'other',
} as const);
```

The `key` column on Categories is the stable, locale-independent identifier. It is the correct field to match against when determining if a user already has a given default category.

**Test conventions** — `packages/backend/src/services/user/locale-aware-signup.e2e.ts:132-218` defines `EXPECTED_MAIN_KEYS` and `EXPECTED_SUBCATEGORY_KEYS` — hardcoded canonical key sets. These must be updated whenever the taxonomy changes.

**Commands you will need:**

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Generate migration | `npm -w packages/backend run migrate:generate -- --name backfill-new-default-categories` | creates timestamped file in `src/migrations/` |
| Run migration in dev | `npm -w packages/backend run migrate:dev` | exit 0 |
| Revert migration | `npm -w packages/backend run migrate:dev:undo` | exit 0 |
| Unit typecheck | `npm -w packages/backend run typecheck` | exit 0, no errors |
| E2E tests | `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` | all pass |

## Scope

**In scope:**
- `packages/backend/src/migrations/<timestamp>-backfill-new-default-categories.ts` (create)
- `packages/backend/src/services/user/locale-aware-signup.e2e.ts` (update canonical key sets for future plans — for this plan, key sets stay the same since no new categories are added yet)

**Out of scope:**
- `packages/backend/src/common/const/default-categories.ts` — taxonomy content is plan 002
- `packages/backend/src/services/user/create-user-with-defaults.service.ts` — signup seeding works correctly; no change needed
- Any frontend files
- `packages/backend/src/i18n/locales/*.json` — i18n is plan 002

## Git workflow

- Branch: `advisor/001-migration-backfill-framework`
- Commit style (from `git log` convention — imperative mood, lowercase prefix):
  `feat(categories): add migration pattern for backfilling new defaults`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Generate the migration file

Run the migration generator:
```
npm -w packages/backend run migrate:generate -- --name backfill-new-default-categories
```

This creates a file at `packages/backend/src/migrations/<timestamp>-backfill-new-default-categories.js`. Note: the generator produces `.js` — rename it to `.ts` to match the existing TS migrations pattern (e.g., `20260506000000-add-key-to-categories.ts`). The Sequelize runner resolves `.ts` files because `config/db/config.js` calls `require('ts-node/register')` at the top, and the `.sequelizerc` at line 7 sets `migrations-path` to `src/migrations` which includes both `.js` and `.ts` files.

**Per CLAUDE.md rule #11**: if Plan 001's migration hasn't been merged to `main` yet when you start, and Plan 002's executor needs to add data arrays to it — modify the existing (unmerged) file rather than creating a new migration. Only create a separate migration if this one is already on `main`.

**Verify**: file exists at `packages/backend/src/migrations/<timestamp>-backfill-new-default-categories.ts`
Expected: the file contains the skeleton `module.exports = { up: ..., down: ... }`.

### Step 2: Implement the `up` migration

Replace the generated contents with a migration that:

1. Defines the NEW categories structure as inline data (initially empty — this plan creates the framework; plan 002 fills it).
2. For each defined main category: INSERTs a row for every user who does NOT already have a row with that `key`.
3. For each defined subcategory: INSERTs a row for every user who has the parent row (matched by parent `key`) but does NOT already have a child row with that subcategory `key`.

The data structure should be an array of objects, defined at the top of the migration:

```typescript
interface NewMainCategory {
  key: string;
  name: string;
  type: string;
  color: string;
  icon: string | null;
}

interface NewSubCategory {
  parentKey: string;
  key: string;
  name: string;
  type: string;
  icon: string | null;
}
```

For this plan, define BOTH arrays as empty (`const NEW_MAIN_CATEGORIES: NewMainCategory[] = [];`). The empty arrays make the migration a no-op until plan 002 fills them. This lets the migration ship independently and be verified as correct (runs, does nothing, exits 0) before any taxonomies change.

**SQL pattern** for inserting a main category for all users who lack it:

```sql
INSERT INTO "Categories" (id, name, key, icon, color, type, "parentId", "userId")
SELECT
  gen_random_uuid(),  -- or use uuid_generate_v4() — check which function is available
  :name, :key, :icon, :color, :type, NULL, u.id
FROM "Users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Categories" c
  WHERE c."userId" = u.id AND c."key" = :key
);
```

Wrap in a transaction (same pattern as the existing migration at line 404-471).

For subcategories, join against the parent by `key`:

```sql
INSERT INTO "Categories" (id, name, key, icon, color, type, "parentId", "userId")
SELECT
  gen_random_uuid(),
  :subName, :subKey, :subIcon, p.color, :subType, p.id, p."userId"
FROM "Categories" p
WHERE p."key" = :parentKey
  AND p."parentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Categories" c
    WHERE c."userId" = p."userId"
      AND c."parentId" = p.id
      AND c."key" = :subKey
  );
```

Use parameterized queries (`queryInterface.sequelize.query(sql, { replacements: {...}, transaction: t })`).

**UUID generation**: The existing migration at `20260516000000-migrate-int-pk-to-uuid.ts:206` confirms `gen_random_uuid()` is available (via `pgcrypto` extension, available since PG 9.4). Use `gen_random_uuid()` in all SQL. No import needed for the SQL path.

If for any reason the PG function isn't available (check by running `SELECT gen_random_uuid();` against the dev database): import the `uuid` package (it's a dependency listed in the backend's `package.json`) and use `uuidv7()` at the top of the migration file:
```typescript
import { v7 as uuidv7 } from 'uuid';
```
Then replace `gen_random_uuid()` with `'${uuidv7()}'::uuid` in the SQL (or generate IDs in TS and interpolate them into the VALUES list).

**Verify**: Run the migration in dev:
```
npm -w packages/backend run migrate:dev
```
Expected: exits 0, reports "0 migrations pending" after running. Since the arrays are empty, no rows are inserted. Confirm by:
```
docker compose exec -T db psql -U ${APPLICATION_DB_USERNAME} -d ${APPLICATION_DB_DATABASE} -c "SELECT COUNT(*) FROM \"Categories\""
```
Compare the count before and after — should be identical. DB credentials come from `packages/backend/.env.development` / `.env.development.local` — the service name is `db` (defined in `docker/dev/docker-compose.yml:42`).

### Step 3: Implement the `down` migration

The `down` migration should DELETE any categories whose `key` matches one of the new keys listed in the migration's data arrays. **Important**: match on `key` only — do NOT use `type = 'custom'` as a guard. The `type` column is `'custom'` for both seed categories AND user-created categories (only `other` is `'internal'`), so filtering on `type` would not prevent accidental deletion. Matching on `key` is safe here because these are brand-new keys introduced by this migration — no existing user-created row could have them. For the initial empty state, the down migration is a no-op. Structure it with the same data arrays so it's ready for plan 002:

```typescript
down: async (queryInterface: QueryInterface): Promise<void> => {
  const t = await queryInterface.sequelize.transaction();
  try {
    for (const cat of NEW_MAIN_CATEGORIES) {
      await queryInterface.sequelize.query(
        `DELETE FROM "Categories" WHERE "key" = :key`,
        { replacements: { key: cat.key }, transaction: t },
      );
    }
    // For subcategories, delete only those whose parent is also a seeded category
    for (const sub of NEW_SUBCATEGORIES) {
      await queryInterface.sequelize.query(
        `DELETE FROM "Categories" c
          USING "Categories" p
          WHERE c."parentId" = p.id
            AND p."key" = :parentKey
            AND c."key" = :subKey`,
        { replacements: { parentKey: sub.parentKey, subKey: sub.key }, transaction: t },
      );
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
},
```

**Verify**: Run `npm -w packages/backend run migrate:dev:undo` to revert, then `npm -w packages/backend run migrate:dev` to re-apply. Both exit 0. Verify the revert removed rows (if any existed) by querying category count before and after.

### Step 4: Verify the migration framework end-to-end

Run the full e2e test suite for category-related tests:
```
npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'
```

Expected: all tests pass. The test creates fresh users via the auth endpoint, which seeds categories via `create-user-with-defaults.service.ts`. The migration doesn't interact with new users — it only touches existing users — so existing tests should not be affected.

## Test plan

No new tests needed for this plan (framework only, no behavior changes). The migration is verified by:
- Running it (no-op pass) — confirms the SQL is valid and the transaction pattern works
- Reverting it (no-op pass) — confirms the down path is wired
- Existing signup e2e tests still pass — confirms no collateral damage

When plan 002 fills the arrays, the e2e test in `locale-aware-signup.e2e.ts` will be updated with the new expected keyset.

## Done criteria

ALL must hold:
- [ ] `npm -w packages/backend run typecheck` exits 0
- [ ] `npm -w packages/backend run migrate:dev` exits 0 (runs the new migration, zero rows changed since arrays are empty)
- [ ] `npm -w packages/backend run migrate:dev:undo` exits 0 (reverts cleanly)
- [ ] `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

Stop and report back if:
- The migration generator produces a file that doesn't use the `module.exports = { up, down }` pattern. All existing TS migrations (`80+ files`) use this pattern with `QueryInterface` types. If the generator produces a different structure, convert it manually — the `.sequelizerc` config chain already loads `ts-node/register` so TypeScript is fully supported.
- The PostgreSQL instance doesn't have `gen_random_uuid()` or `uuid-ossp` extension. Check by querying `SELECT gen_random_uuid();` directly against the dev database. If unavailable, use `uuidv7()` from the `uuid` package (import at top of migration file — the `uuid` package is in the backend's `dependencies`).
- `npm -w packages/backend run migrate:dev` fails — report the full error output.

## Maintenance notes

- When plan 002 fills the `NEW_MAIN_CATEGORIES` and `NEW_SUBCATEGORIES` arrays, verify the down migration correctly reverses its own work without touching user-created categories.
- Future taxonomy additions in later plans follow the same pattern: append to the arrays in their own migration (or keep extending this file if it hasn't been merged to main yet — per the project's rule #11).
- The `key` column is the single source of truth for matching. Always match on `key`, never on `name` (names are locale-dependent and user-editable).
