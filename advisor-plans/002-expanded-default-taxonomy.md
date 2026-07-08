# Plan 002: Expanded default taxonomy — new main categories, missing subcategories, i18n

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 5a6cea81..HEAD -- packages/backend/src/common/const/default-categories.ts packages/backend/src/i18n/locales/ packages/backend/src/migrations/ packages/backend/src/services/user/locale-aware-signup.e2e.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: advisor-plans/001-migration-framework-backfill-default-categories.md (the migration file it creates must exist and its arrays must be populated)
- **Category**: correctness
- **Planned at**: commit `5a6cea81`, 2026-07-08

## Why this matters

The current 11-category taxonomy has gaps that affect both NA and EU users. Healthcare, education, and pets are buried as subcategories of "Life" or "Shopping" despite being major household budget categories. Common expense types like childcare, HOA fees, property tax, rideshare, tolls, retirement savings, and meal delivery are missing entirely. Users must manually create these, or force-fit expenses into wrong categories — producing unreliable spending reports.

This plan adds the missing categories so the default taxonomy works out-of-the-box for a global (NA+EU) audience. It updates the seed structure, i18n for all 3 locales, the existing-user backfill migration from plan 001, and the test's canonical key assertions.

## Current state

**Seed structure** — `packages/backend/src/common/const/default-categories.ts:46-57` defines 11 main categories:
- food, shopping, housing, transportation, vehicle, life, communication, financial-expenses, investments, income, other

**Current state excerpt** — `packages/backend/src/common/const/default-categories.ts:22-34`:
```typescript
const CATEGORY_KEYS = Object.freeze({
  food: 'food', shopping: 'shopping', housing: 'housing',
  transportation: 'transportation', vehicle: 'vehicle', life: 'life',
  communication: 'communication', financialExpenses: 'financial-expenses',
  investments: 'investments', income: 'income', other: 'other',
} as const);
```

**Main categories** at `default-categories.ts:46-57`:
- `food`, `shopping`, `housing`, `transportation`, `vehicle`, `life`, `communication`, `financial-expenses`, `investments`, `income`, `other`

**Subcategory groups** at `default-categories.ts:59-179` cover 11 parent groups with 69 subcategories. Key gaps:
- **Health & Medical** — currently a subcategory (`life/health-care-doctor`). Healthcare is a top-3 household expense in both NA (insurance premiums, deductibles, copays) and EU (dental, therapy, private insurance top-ups).
- **Education** — currently a subcategory (`life/education-development`). Student loans, tuition, children's schooling, professional development.
- **Pets** — currently a subcategory (`shopping/pets-animals`), wrongly parented under Shopping. Pet food, vet, grooming, boarding are recurring operational expenses.
- **Subscriptions** — no category at all. Streaming is under `life/tv-streaming`, SaaS under `communication/software-apps-games`.
- **Missing subcategories** — childcare/daycare, HOA fees/strata, property tax, tolls, rideshare, furniture/appliances, retirement contributions (401k/IRA/pension), meal delivery/takeout, moving/relocation.

**Locales**: 3 supported — en, uk, es. Each has a `defaultCategories` section in its JSON file.

**Test hardcodes canonical keys** — `packages/backend/src/services/user/locale-aware-signup.e2e.ts:132-218` defines `EXPECTED_MAIN_KEYS` and `EXPECTED_SUBCATEGORY_KEYS` — these MUST be updated when the taxonomy changes.

**Current state** (continued):

**Icon convention** — all existing icons use the FluentUI System icon set with the `-20-filled` suffix (e.g., `'food-20-filled'`, `'home-20-filled'`). Plan 002 icons must follow the same naming convention.

**Migration convention** — migrations cannot import from `src/services` or `src/common`
(`20260506000000-add-key-to-categories.ts:20-24`). Plan 001's migration inlines its data arrays and uses raw SQL.

**Commands:**

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm -w packages/backend run typecheck` | exit 0, no errors |
| Run migration | `npm -w packages/backend run migrate:dev` | exit 0 |
| E2E tests | `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` | all pass |
| Unit tests | `npm -w packages/backend run test:unit` | exit 0 |

## Scope

**In scope:**
- `packages/backend/src/common/const/default-categories.ts` — add new main categories + subcategories
- `packages/backend/src/i18n/locales/en.json` — add translation keys under `defaultCategories.*`
- `packages/backend/src/i18n/locales/uk.json` — add translation keys under `defaultCategories.*`
- `packages/backend/src/i18n/locales/es.json` — add translation keys under `defaultCategories.*`
- `packages/backend/src/migrations/<timestamp from plan 001>-backfill-new-default-categories.ts` — fill the `NEW_MAIN_CATEGORIES` and `NEW_SUBCATEGORIES` arrays
- `packages/backend/src/services/user/locale-aware-signup.e2e.ts` — update `EXPECTED_MAIN_KEYS` and `EXPECTED_SUBCATEGORY_KEYS`

**Out of scope:**
- `packages/backend/src/services/user/create-user-with-defaults.service.ts` — it already uses `getTranslatedCategories` which dynamically reads the structure; no change needed
- `packages/backend/src/services/demo/seed-demo-data.service.ts` — demo is static; no change
- Any frontend files
- `default-tags.ts` — unrelated
- Category deletion or restructuring of existing subcategories under Life — this plan is additive only

## Git workflow

- Branch: `advisor/002-expanded-taxonomy`
- Commit per logical unit: (1) seed structure + i18n, (2) migration array, (3) test keys
- Commit style: `feat(categories): add health/education/pets main categories and missing subcategories`

## Steps

### Step 1: Add new main category keys to `CATEGORY_KEYS`

Edit `packages/backend/src/common/const/default-categories.ts:22-34`. Add:

```typescript
const CATEGORY_KEYS = Object.freeze({
  // ... existing keys ...
  health: 'health',
  education: 'education',
  pets: 'pets',
  subscriptions: 'subscriptions', // see step 2b for subcategory choices
} as const);
```

Keep existing keys unchanged. Never modify existing key values — they are persisted in the database.

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 2: Add new main categories to `DEFAULT_CATEGORY_STRUCTURE`

Edit `packages/backend/src/common/const/default-categories.ts:46-57`. Append after the existing `main` array entries:

```typescript
{ key: CATEGORY_KEYS.health, type: CATEGORY_TYPES.custom, color: '#1abc9c', icon: 'stethoscope-20-filled' },
{ key: CATEGORY_KEYS.education, type: CATEGORY_TYPES.custom, color: '#9b59b6', icon: 'hat-graduation-20-filled' },
{ key: CATEGORY_KEYS.pets, type: CATEGORY_TYPES.custom, color: '#e67e22', icon: 'animal-dog-20-filled' },
```

**Color & icon choices**: Use distinct colors that don't clash with existing 11. Icons use the FluentUI System icon set (`-20-filled` suffix) — the same convention as all existing icons.

### Step 2b: Add Subscriptions main category (single recommended path)

Add `subscriptions` as a main category with NEW subcategories that don't overlap existing ones (streaming services, SaaS, cloud storage, membership clubs). The existing `life/tv-streaming`, `life/books-audio-subscriptions`, and `communication/software-apps-games` stay under their current parents for existing users — this is additive only.

Add `CATEGORY_KEYS.subscriptions` to the keys object (step 1) and this entry to `DEFAULT_CATEGORY_STRUCTURE.main`:
```typescript
{ key: CATEGORY_KEYS.subscriptions, type: CATEGORY_TYPES.custom, color: '#34495e', icon: 'calendar-20-filled' },
```

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 3: Add subcategories to `DEFAULT_CATEGORY_STRUCTURE`

Edit the `subcategories` array in `packages/backend/src/common/const/default-categories.ts:59-181`. Append entries for the new main categories and add missing subcategories to existing parents.

**New subcategories for new `health` category:**
```typescript
{
  parentKey: CATEGORY_KEYS.health,
  values: [
    { key: 'health-insurance-premiums', type: CATEGORY_TYPES.custom, icon: 'shield-20-filled' },
    { key: 'doctor-visits', type: CATEGORY_TYPES.custom, icon: 'stethoscope-20-filled' },
    { key: 'hospital-surgery', type: CATEGORY_TYPES.custom, icon: 'building-hospital-20-filled' },
    { key: 'prescriptions', type: CATEGORY_TYPES.custom, icon: 'pill-20-filled' },
    { key: 'dental', type: CATEGORY_TYPES.custom, icon: 'tooth-20-filled' },
    { key: 'vision', type: CATEGORY_TYPES.custom, icon: 'eye-20-filled' },
    { key: 'therapy-counseling', type: CATEGORY_TYPES.custom, icon: 'brain-20-filled' },
    { key: 'health-wellness-other', type: CATEGORY_TYPES.custom, icon: 'heart-pulse-20-filled' },
  ],
},
```

**New subcategories for new `education` category:**
```typescript
{
  parentKey: CATEGORY_KEYS.education,
  values: [
    { key: 'tuition-school', type: CATEGORY_TYPES.custom, icon: 'building-library-20-filled' },
    { key: 'courses-certifications', type: CATEGORY_TYPES.custom, icon: 'certificate-20-filled' },
    { key: 'books-supplies', type: CATEGORY_TYPES.custom, icon: 'book-20-filled' },
    { key: 'student-loan-payments', type: CATEGORY_TYPES.custom, icon: 'money-20-filled' },
    { key: 'childcare-daycare', type: CATEGORY_TYPES.custom, icon: 'people-20-filled' },
    { key: 'tutoring-extra-lessons', type: CATEGORY_TYPES.custom, icon: 'hat-graduation-20-filled' },
  ],
},
```

**New subcategories for new `pets` category:**
```typescript
{
  parentKey: CATEGORY_KEYS.pets,
  values: [
    { key: 'pet-food', type: CATEGORY_TYPES.custom, icon: 'cart-20-filled' },
    { key: 'vet-care', type: CATEGORY_TYPES.custom, icon: 'stethoscope-20-filled' },
    { key: 'grooming', type: CATEGORY_TYPES.custom, icon: 'cut-20-filled' },
    { key: 'pet-supplies', type: CATEGORY_TYPES.custom, icon: 'shopping-bag-20-filled' },
    { key: 'boarding-sitting', type: CATEGORY_TYPES.custom, icon: 'building-20-filled' },
    { key: 'pet-insurance', type: CATEGORY_TYPES.custom, icon: 'shield-20-filled' },
  ],
},
```

**New subcategories for new `subscriptions` category (if Option B in step 2b):**
```typescript
{
  parentKey: CATEGORY_KEYS.subscriptions,
  values: [
    { key: 'cloud-storage', type: CATEGORY_TYPES.custom, icon: 'cloud-20-filled' },
    { key: 'news-magazines', type: CATEGORY_TYPES.custom, icon: 'news-20-filled' },
    { key: 'productivity-saas', type: CATEGORY_TYPES.custom, icon: 'apps-20-filled' },
    { key: 'membership-clubs', type: CATEGORY_TYPES.custom, icon: 'people-community-20-filled' },
    { key: 'streaming-video', type: CATEGORY_TYPES.custom, icon: 'video-20-filled' },
    { key: 'streaming-music', type: CATEGORY_TYPES.custom, icon: 'music-note-2-20-filled' },
  ],
},
```

**Additional subcategories for existing `housing` category:** Append to the existing housing subcategories array:
```typescript
{ key: 'hoa-strata-fees', type: CATEGORY_TYPES.custom, icon: 'building-government-20-filled' },
{ key: 'property-tax', type: CATEGORY_TYPES.custom, icon: 'calculator-20-filled' },
{ key: 'furniture-appliances', type: CATEGORY_TYPES.custom, icon: 'table-20-filled' },
{ key: 'moving-relocation', type: CATEGORY_TYPES.custom, icon: 'box-20-filled' },
```

**Additional subcategories for existing `transportation` category:**
```typescript
{ key: 'tolls', type: CATEGORY_TYPES.custom, icon: 'road-20-filled' },
{ key: 'rideshare', type: CATEGORY_TYPES.custom, icon: 'vehicle-cab-20-filled' },
```

**Additional subcategories for existing `food` category:**
```typescript
{ key: 'meal-delivery', type: CATEGORY_TYPES.custom, icon: 'food-20-filled' },
{ key: 'takeout', type: CATEGORY_TYPES.custom, icon: 'food-takeout-20-filled' },
```

**Additional subcategories for existing `investments` category:**
```typescript
{ key: 'retirement-401k-ira', type: CATEGORY_TYPES.custom, icon: 'safe-20-filled' },
{ key: 'index-funds-etfs', type: CATEGORY_TYPES.custom, icon: 'chart-20-filled' },
```

**Additional subcategories for existing `financial-expenses` category:**
```typescript
{ key: 'banking-fees', type: CATEGORY_TYPES.custom, icon: 'receipt-money-20-filled' },
{ key: 'late-payment-fees', type: CATEGORY_TYPES.custom, icon: 'gavel-20-filled' },
```

**Additional subcategories for existing `income` category:**
```typescript
{ key: 'bonus-commission', type: CATEGORY_TYPES.custom, icon: 'money-hand-20-filled' },
{ key: 'tips-gratuity', type: CATEGORY_TYPES.custom, icon: 'hand-wave-20-filled' },
{ key: 'side-hustle', type: CATEGORY_TYPES.custom, icon: 'briefcase-20-filled' },
{ key: 'social-security-pension', type: CATEGORY_TYPES.custom, icon: 'person-20-filled' },
{ key: 'government-benefits', type: CATEGORY_TYPES.custom, icon: 'building-government-20-filled' },
```

**Do NOT duplicate** any existing subcategory keys. Cross-check against the current list. Each `key` under a given parent must be unique.

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 4: Add i18n translations for all 3 locales

Add translations for ALL new keys in `en.json`, `uk.json`, and `es.json` under the `defaultCategories` section. **IMPORTANT**: Append to existing `defaultCategories.main` and `defaultCategories.subcategories` blocks — do NOT replace the entire file or any existing block. Follow the existing structure:

```
defaultCategories.main.<key>: "<translated name>"
defaultCategories.subcategories.<parentKey>.<subKey>: "<translated sub name>"
```

**For `en.json`** (`packages/backend/src/i18n/locales/en.json`), add after the existing `income` entry at line 326:

```json
"health": "Health & Medical",
"education": "Education",
"pets": "Pets",
"subscriptions": "Subscriptions"
```

And the corresponding subcategory entries under `defaultCategories.subcategories`:

For `en.json`:
```json
"health": {
  "health-insurance-premiums": "Health insurance premiums",
  "doctor-visits": "Doctor visits",
  "hospital-surgery": "Hospital & surgery",
  "prescriptions": "Prescriptions",
  "dental": "Dental",
  "vision": "Vision",
  "therapy-counseling": "Therapy & counseling",
  "health-wellness-other": "Other health & wellness"
},
"education": {
  "tuition-school": "Tuition & school fees",
  "courses-certifications": "Courses & certifications",
  "books-supplies": "Books & supplies",
  "student-loan-payments": "Student loan payments",
  "childcare-daycare": "Childcare & daycare",
  "tutoring-extra-lessons": "Tutoring & extra lessons"
},
"pets": {
  "pet-food": "Pet food",
  "vet-care": "Vet care",
  "grooming": "Grooming",
  "pet-supplies": "Pet supplies",
  "boarding-sitting": "Boarding & sitting",
  "pet-insurance": "Pet insurance"
},
"subscriptions": {
  "cloud-storage": "Cloud storage",
  "news-magazines": "News & magazines",
  "productivity-saas": "Productivity SaaS",
  "membership-clubs": "Membership clubs",
  "streaming-video": "Streaming (video)",
  "streaming-music": "Streaming (music)"
},
"housing": {
  "hoa-strata-fees": "HOA / strata fees",
  "property-tax": "Property tax",
  "furniture-appliances": "Furniture & appliances",
  "moving-relocation": "Moving & relocation"
},
"transportation": {
  "tolls": "Tolls",
  "rideshare": "Rideshare (Uber/Lyft)"
},
"food": {
  "meal-delivery": "Meal delivery (HelloFresh etc.)",
  "takeout": "Takeout"
},
"investments": {
  "retirement-401k-ira": "Retirement (401k/IRA)",
  "index-funds-etfs": "Index funds & ETFs"
},
"financial-expenses": {
  "banking-fees": "Banking fees",
  "late-payment-fees": "Late payment fees"
},
"income": {
  "bonus-commission": "Bonus & commission",
  "tips-gratuity": "Tips & gratuity",
  "side-hustle": "Side hustle",
  "social-security-pension": "Social Security / pension",
  "government-benefits": "Government benefits"
}
```

For **`uk.json`** and **`es.json`**, provide appropriate translations. Use the i18n-editor subagent per the project's rule #7. If translating manually, follow the existing pattern in those files.

**Verify**: `npm -w packages/backend run typecheck` exits 0.

**Midpoint verification**: run the e2e signup test to confirm the new seed structure works for new signups before the migration changes:
```
npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'
```
Expected: all tests pass. If they fail, the error output shows the actual vs expected key sets — fix any mismatches before proceeding.

### Step 5: Fill the migration arrays

Edit the migration file created in plan 001 (`packages/backend/src/migrations/<timestamp>-backfill-new-default-categories.ts`). Populate the `NEW_MAIN_CATEGORIES` and `NEW_SUBCATEGORIES` arrays with the same data added in steps 2 and 3 above. Use English names — migration names are a fallback for pre-existing users; the `key` is the stable identifier.

The arrays from Plan 001 are typed as:
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

Full migration entries for main categories (5 fields each):
```typescript
{ key: 'health', name: 'Health & Medical', type: 'custom', color: '#1abc9c', icon: 'stethoscope-20-filled' },
{ key: 'education', name: 'Education', type: 'custom', color: '#9b59b6', icon: 'hat-graduation-20-filled' },
{ key: 'pets', name: 'Pets', type: 'custom', color: '#e67e22', icon: 'animal-dog-20-filled' },
{ key: 'subscriptions', name: 'Subscriptions', type: 'custom', color: '#34495e', icon: 'calendar-20-filled' },
```

For subcategories, each has 5 fields (parentKey, key, name, type, icon). Full entries mirroring step 3.

**Important**: Do NOT duplicate any entries that might already exist from a previous run. The INSERT SQL already uses `WHERE NOT EXISTS` against key + userId — it's safe to re-run.

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 6: Update the e2e test canonical key sets

Edit `packages/backend/src/services/user/locale-aware-signup.e2e.ts:132-218`:

Add to `EXPECTED_MAIN_KEYS` (around line 143):
```typescript
'health',
'education',
'pets',
```
(plus `'subscriptions'` for the subscriptions main category from step 2b)

Add to `EXPECTED_SUBCATEGORY_KEYS` all new composite keys:
```typescript
'health/health-insurance-premiums',
'health/doctor-visits',
'health/hospital-surgery',
'health/prescriptions',
'health/dental',
'health/vision',
'health/therapy-counseling',
'health/health-wellness-other',
'education/tuition-school',
'education/courses-certifications',
'education/books-supplies',
'education/student-loan-payments',
'education/childcare-daycare',
'education/tutoring-extra-lessons',
'pets/pet-food',
'pets/vet-care',
'pets/grooming',
'pets/pet-supplies',
'pets/boarding-sitting',
'pets/pet-insurance',
'food/meal-delivery',
'food/takeout',
'housing/hoa-strata-fees',
'housing/property-tax',
'housing/furniture-appliances',
'housing/moving-relocation',
'transportation/tolls',
'transportation/rideshare',
'investments/retirement-401k-ira',
'investments/index-funds-etfs',
'financial-expenses/banking-fees',
'financial-expenses/late-payment-fees',
'income/bonus-commission',
'income/tips-gratuity',
'income/side-hustle',
'income/social-security-pension',
'income/government-benefits',
```
(plus subscription entries if added in step 2b)

**Verify**: Run `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'`. Expected: all pass, including the new keys. If it fails, the test prints the diff between expected and actual key sets — match your actual structure against the expecation.

### Step 7: Run all tests

```
npm -w packages/backend run test:e2e
```
Expected: exit 0, all existing e2e tests pass (the new categories should not break any existing test).

```
npm -w packages/backend run test:unit
```
Expected: exit 0.

### Step 8: Run the migration against dev database

```
npm -w packages/backend run migrate:dev
```
Expected: exits 0. Verify new rows were created:
```
-- count new main categories
SELECT key, COUNT(*) FROM "Categories" WHERE key IN ('health','education','pets') AND "parentId" IS NULL GROUP BY key;
-- count new subcategories
SELECT c.key, COUNT(*) FROM "Categories" c JOIN "Categories" p ON c."parentId" = p.id WHERE p.key = 'health' GROUP BY c.key;
```

## Test plan

- **Updated**: `locale-aware-signup.e2e.ts` canonical key assertions cover the new taxonomy
- **Covered cases**: English, Ukrainian, Spanish signups all receive the new categories with correct keys
- **No new test files needed** — the existing signup e2e tests exercise the seed path end-to-end
- **Migration e2e**: The migration is tested by running it against the dev database and verifying row counts

## Done criteria

ALL must hold:
- [ ] `npm -w packages/backend run typecheck` exits 0
- [ ] `npm -w packages/backend run test:e2e -- --testPathPattern='locale-aware-signup'` exits 0
- [ ] `npm -w packages/backend run test:e2e` exits 0 (full suite)
- [ ] `npm -w packages/backend run test:unit` exits 0
- [ ] `npm -w packages/backend run migrate:dev` exits 0 and inserts new category rows
- [ ] `git diff` shows changes only in the in-scope files
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

Stop and report back if:
- Plan 001's migration file (`packages/backend/src/migrations/<timestamp>-backfill-new-default-categories.ts`) does not exist — it must be created first per CLAUDE.md rule #11 (check if an unmerged file already exists on this branch; if not, implement Plan 001 first)
- Any existing test breaks due to new categories (e.g., a test hardcodes category IDs or counts)
- An i18n key path is wrong and produces `t()` returning the key instead of the translation — check the `en.json` nesting matches the existing `defaultCategories.main.food` pattern exactly
- The `locale-aware-signup.e2e.ts` assertion `expect(mainKeysSeen).toEqual(EXPECTED_MAIN_KEYS)` fails — the test output shows the actual vs expected sets; paste both into the report so the mismatch is clear

## Maintenance notes

- When adding more categories in the future, update the same 4 files: `default-categories.ts`, the locale JSONs, the migration arrays, and the e2e test key sets.
- The e2e test's `EXPECTED_*_KEYS` are intentionally hardcoded as an independent reference (see `locale-aware-signup.e2e.ts:125-130` comment). Changing the taxonomy MUST update these sets.
- Icons use the FluentUI System icon set (the `-20-filled` suffix convention). Verify icon names exist before shipping. If unsure, use a known-good icon like `home-20-filled` or `money-20-filled` and note in review.
