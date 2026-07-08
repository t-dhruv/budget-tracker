# Plan 003: Fix pets mis-parenting and naming overlaps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 5a6cea81..HEAD -- packages/backend/src/common/const/default-categories.ts packages/backend/src/i18n/locales/ packages/backend/src/services/user/locale-aware-signup.e2e.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: advisor-plans/002-expanded-default-taxonomy.md (which adds Pets as a main category — this plan then removes it from Shopping)
- **Category**: correctness
- **Planned at**: commit `5a6cea81`, 2026-07-08

## Why this matters

After plan 002 adds "Pets" as a main category, `pets-animals` will appear in TWO places: as a subcategory of `shopping` AND in the new `pets` main category. This plan removes it from Shopping. It also fixes two naming overlaps: `health-beauty` (Shopping) vs `wellness-beauty` (Life), and `charity-gifts` (Life) vs `gifts` (Income). These overlaps cause inconsistent categorization — users guess which bucket to use and pick differently over time, producing unreliable spending reports.

## Current state

**Pets in Shopping** — `packages/backend/src/common/const/default-categories.ts:76`:
```typescript
{ key: 'pets-animals', type: CATEGORY_TYPES.custom, icon: 'animal-dog-20-filled' },
```
This is a subcategory under `parentKey: CATEGORY_KEYS.shopping`.

**After plan 002**, `pets` is a new main category with subcategories like `pet-food`, `vet-care`, etc. The old `shopping/pets-animals` becomes redundant — users should use the `pets` main category instead.

**Naming overlap #1** — `health-beauty` under `shopping` (line 73) vs `wellness-beauty` under `life` (line 118):
```typescript
// line 73 — under shopping:
{ key: 'health-beauty', type: CATEGORY_TYPES.custom, icon: 'sparkle-20-filled' },
// line 118 — under life:
{ key: 'wellness-beauty', type: CATEGORY_TYPES.custom, icon: 'sparkle-20-filled' },
```
"Health and beauty" (Shopping) and "Wellness, beauty" (Life) are near-synonyms. A user buying skincare could pick either.

**Naming overlap #2** — `charity-gifts` under `life` (line 127) vs `gifts` under `income` (line 176):
```typescript
// line 127 — under life:
{ key: 'charity-gifts', type: CATEGORY_TYPES.custom, icon: 'gift-20-filled' },
// line 176 — under income:
{ key: 'gifts', type: CATEGORY_TYPES.custom, icon: 'gift-20-filled' },
```
"Charity, gifts" (expense) and "Gifts" (income) — both use `gift-20-filled` icon. A cash birthday gift from a relative could be entered as expense (under life/charity-gifts) or income (under income/gifts).

## Scope

**In scope:**
- `packages/backend/src/common/const/default-categories.ts` — structural definitions
- `packages/backend/src/i18n/locales/en.json` — i18n key rename + text updates
- `packages/backend/src/i18n/locales/uk.json` — i18n key rename + text updates
- `packages/backend/src/i18n/locales/es.json` — i18n key rename + text updates
- `packages/backend/src/services/user/locale-aware-signup.e2e.ts` — update EXPECTED subcategory keys

**Out of scope:**
- `packages/backend/src/services/user/create-user-with-defaults.service.ts` — signup seeding works correctly; no change needed
- `packages/backend/src/migrations/` — this plan does NOT touch existing data. Existing users' `shopping/pets-animals` rows are left in place (they still work, just are no longer seeded). This is additive from the default-categories perspective (removing from the seed definition does not affect persisted rows).
- Any frontend files

**IMPORTANT**: This plan only changes the SEED definition. Existing users' existing categories are NOT deleted. The migration pattern from plan 001 only adds, never removes. Deleting existing rows would break users' transaction categorizations. The change only affects what NEW users receive at signup.

**Commands:**

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm -w packages/backend run typecheck` | exit 0, no errors |
| E2E tests | `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` | all pass |
| Full e2e | `npm -w packages/backend run test:e2e` | exit 0 |
| Unit tests | `npm -w packages/backend run test:unit` | exit 0 |

## Git workflow

- Branch: `advisor/003-fix-pets-naming`
- Commit: `fix(categories): remove shopping/pets-animals, rename naming overlaps`
- Do NOT push or open a PR unless instructed

## Steps

### Step 0: Verify Plan 002 applied

Confirm the seed structure from Plan 002 is in place before making changes:

1. Check `CATEGORY_KEYS` in `default-categories.ts` includes `health`, `education`, `pets` — if missing, apply Plan 002 first.
2. Check the e2e test's `EXPECTED_MAIN_KEYS` includes `'health'`, `'education'`, `'pets'` — if not, the test hasn't been updated and previous steps are incomplete.
3. Run `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` — all tests MUST pass before proceeding.

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 1: Remove `pets-animals` from Shopping subcategories

Edit `packages/backend/src/common/const/default-categories.ts:68-83`. Remove this line from the `shopping` subcategory values:
```
{ key: 'pets-animals', type: CATEGORY_TYPES.custom, icon: 'animal-dog-20-filled' },
```

Keep all other shopping subcategories. The line numbers will shift.

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 2: Resolve `health-beauty` / `wellness-beauty` overlap

Edit the `shopping` subcategories. Rename `health-beauty` to `personal-care` (more precise — covers cosmetics, skincare, haircare, toiletries without implying medical):

```typescript
{ key: 'personal-care', type: CATEGORY_TYPES.custom, icon: 'sparkle-20-filled' },
```

The `key` changes from `health-beauty` to `personal-care`. This means:
- The i18n key path changes from `defaultCategories.subcategories.shopping.health-beauty` to `defaultCategories.subcategories.shopping.personal-care`
- The i18n value should be updated to reflect the narrower meaning

Edit the `life` subcategories. The `wellness-beauty` key under Life is fine — it covers spa, massages, salon treatments (experiential/services rather than retail products). Keep it as-is.

**Update i18n** — in all 3 locale files (`en.json`, `uk.json`, `es.json`):
- Change the key from `health-beauty` to `personal-care` under `defaultCategories.subcategories.shopping`
- Update the English name from `"Health and beauty"` to `"Personal care"`
- For Spanish (`es.json`): change `"Salud y belleza"` → `"Cuidado personal"`
- For Ukrainian (`uk.json`): change `"Здоров'я і краса"` → `"Догляд за собою"`

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 3: Resolve `charity-gifts` / `gifts` overlap

Edit the `life` subcategories. Rename `charity-gifts` to `charity-donations`:

```typescript
{ key: 'charity-donations', type: CATEGORY_TYPES.custom, icon: 'heart-20-filled' },
```

(`heart-20-filled` is already used by the `life` main category at default-categories.ts:52 — verified available in the FluentUI System icon set.)

The `gifts` subcategory under `income` is fine — it represents monetary gifts received. The distinction is now clear: `charity-donations` (money given away) vs `gifts` (money received).

**Update i18n** — in all 3 locale files:
- Change the key from `charity-gifts` to `charity-donations` under `defaultCategories.subcategories.life`
- Update the English name from `"Charity, gifts"` → `"Charity & donations"`
- For Spanish (`es.json`): change `"Caridad, regalos"` → `"Donaciones benéficas"`
- For Ukrainian (`uk.json`): change `"Благодійність, подарунки"` → `"Благодійні пожертви"`
- Keep the `gifts` entry under `income` unchanged

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 4: Update the e2e test canonical key sets

Edit `packages/backend/src/services/user/locale-aware-signup.e2e.ts`:

1. Remove `'shopping/pets-animals'` from `EXPECTED_SUBCATEGORY_KEYS`
2. Replace `'shopping/health-beauty'` with `'shopping/personal-care'` in `EXPECTED_SUBCATEGORY_KEYS`
3. Replace `'life/charity-gifts'` with `'life/charity-donations'` in `EXPECTED_SUBCATEGORY_KEYS`
4. Update the test name string assertions in the "Category creation with English locale" test if any reference the old names (lines 57-78):

The existing assertions at lines 67-77 check `mainCategoryNames.toContain('Food & Drinks')` etc. These should be unaffected. But double-check that no test directly references "Health and beauty" or "Charity, gifts" or "Pets, animals" as subcategory name literals.

**Verify**: 
```
npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'
```
Expected: all pass.

### Step 5: Run full test suite

```
npm -w packages/backend run test:e2e
```
Expected: exit 0.

```
npm -w packages/backend run test:unit
```
Expected: exit 0.

## Test plan

- **Updated**: `locale-aware-signup.e2e.ts` canonical key sets match the new structure
- **Covered**: English, Ukrainian, Spanish signups get correct keys (the test already tests all locales)
- **No new test files**: the key-set assertion test catches any drift

## Done criteria

ALL must hold:
- [ ] `shopping/pets-animals` removed from seed definition
- [ ] `shopping/health-beauty` renamed to `shopping/personal-care` in seed + all 3 locale files
- [ ] `life/charity-gifts` renamed to `life/charity-donations` in seed + all 3 locale files
- [ ] `npm -w packages/backend run typecheck` exits 0
- [ ] `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` exits 0
- [ ] `npm -w packages/backend run test:e2e` exits 0 (full suite)
- [ ] `npm -w packages/backend run test:unit` exits 0
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

Stop and report back if:
- The i18n key rename breaks the `getTranslatedCategories` function — verify by checking that `defaultCategories.ts:207` constructs the path as `defaultCategories.subcategories.${subcat.parentKey}.${sub.key}`, which means renaming `health-beauty` to `personal-care` means the i18n file must have the new key at the new path. If any translation is missing, the function returns the key string as the name.
- Any existing e2e test references "Pets, animals", "Health and beauty", or "Charity, gifts" as literal strings — these would fail after the rename. Search with: `grep -rn "Pets, animals\|Health and beauty\|Charity, gifts" packages/backend/src/services/user/`
- A test asserts on the COUNT of subcategories under shopping or life — after removing/renaming, the count changes.

## Maintenance notes

- The `key` column on existing rows is NOT affected by seed definition changes. Rows already persisted with `key = 'health-beauty'` or `key = 'charity-gifts'` keep their keys. Only new signups get the new keys.
- If a future migration wants to migrate existing users' old `shopping/pets-animals` rows to the new `pets` main category, that's a separate, higher-effort plan that requires transaction-aware re-parenting. Not included here.
- Monitor whether the renames cause confusion — the old category names will still appear in existing users' UIs (they have persisted names). New users see the new names.
