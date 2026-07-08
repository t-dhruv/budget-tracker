# Plan 004: Add AI auto-categorization toggle to CSV import

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 12ff8efc..HEAD -- packages/shared/src/types/import-export.ts packages/backend/src/services/import-export/csv-import/ packages/backend/src/controllers/import-export/execute-import.controller.ts packages/frontend/src/stores/import-export.ts packages/frontend/src/api/import-export.ts packages/frontend/src/pages/import-export/components/review-duplicates-step/index.vue`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `12ff8efc`, 2026-07-08

## Why this matters

CSV-imported transactions get a category from the CSV column or a default, but never trigger the AI categorization pipeline. Users who already have AI set up must manually re-categorize every imported batch. The statement-parser import path already auto-queues categorization after import (`execute-import.service.ts:200-211`), proving the pattern works. Adding an opt-in toggle gives users the same convenience for CSV imports — import + auto-categorize in one flow, with a choice to skip when the CSV already carries the right categories.

## Current state

### Backend — CSV import worker does NOT queue AI categorization

`packages/backend/src/services/import-export/csv-import/execute-import/index.ts` — the `executeImport` function creates transactions but returns without triggering categorization. The `CsvImportSummary` it returns carries `newTransactionIds` (line 303) — the exact data needed to queue a categorization job.

`packages/backend/src/services/import-export/csv-import/csv-import-queue.ts` — the worker at line 81 calls `executeImport()`, gets back the summary, and returns it. No post-import hook.

Compare with the statement-parser pattern at `packages/backend/src/services/import-export/statement-parser/execute-import.service.ts:196-214`:
```typescript
export async function executeImport(params: ExecuteImportParams): Promise<StatementExecuteImportResponse> {
  const result = await executeImportImpl(params);
  // Queue AI categorization for the newly imported transactions.
  if (result.newTransactionIds.length > 0) {
    await queueCategorizationJob({
      userId: params.userId,
      transactionIds: result.newTransactionIds,
    });
  }
  return result;
}
```

### Backend — queueCategorizationJob entry point

`packages/backend/src/services/ai-categorization/categorization-queue.ts:146-185`:
```typescript
export async function queueCategorizationJob({
  userId,
  transactionIds,
}: {
  userId: number;
  transactionIds: string[];
}): Promise<string> { ... }
```
Exported from `@services/ai-categorization` (index.ts line 1). Already used by statement-parser.

### Backend — controller and route schema

`packages/backend/src/controllers/import-export/execute-import.controller.ts:13-63` — Zod schema at line 14-28 validates the request body. No `categorizeWithAi` field exists.

### Shared types

`packages/shared/src/types/import-export.ts:293-317` — `ExecuteImportRequest` interface has no `categorizeWithAi` field. `CsvImportSummary` at line 341 has `newTransactionIds` (already present).

### Frontend — review step

`packages/frontend/src/pages/import-export/components/review-duplicates-step/index.vue:186-206` — footer has a back button and an "Import N records" button. No AI toggle.

### Frontend — store executeImport

`packages/frontend/src/stores/import-export.ts:572-632` — `executeImport` builds the payload and calls `executeImportApi`. No `categorizeWithAi` in the payload.

### Frontend — API layer

`packages/frontend/src/api/import-export.ts:50-53` — `executeImport` sends `ExecuteImportRequest` unchanged.

### Repo conventions that apply

- **Backend**: Route→controller→service pattern. Controller uses `createController` factory. Service uses object params, no classes. Error types from `@js/errors`.
- **Shared types**: Interfaces in `packages/shared/src/types/` are the single source of truth for API contracts. Shared between backend and frontend.
- **Frontend**: Pinia stores for complex state. `src/api/` for API calls. Components use `<script setup lang="ts">`. Tailwind CSS. i18n via `$t()` and `vue-i18n`.
- **All files**: kebab-case filenames.

## Commands you will need

| Purpose                               | Command (from repo root)                                         | Expected on success              |
|---------------------------------------|------------------------------------------------------------------|----------------------------------|
| Typecheck (backend only)              | `npm -w packages/backend run typecheck`                          | exit 0, no errors                |
| Typecheck (frontend only)             | `npm -w packages/frontend run typecheck`                         | exit 0, no errors                |
| Lint                                  | `npm run lint`                                                    | exit 0                           |
| Run CSV import e2e tests              | `npm -w packages/backend run test:e2e -- --testPathPattern='csv-import/execute-import'` | all pass |
| Run all e2e backend tests             | `npm -w packages/backend run test:e2e`                           | all pass                         |
| Run frontend unit tests               | `npm -w packages/frontend run test`                              | all pass                         |

## Scope

**In scope** (the only files you should modify):
- `packages/shared/src/types/import-export.ts` — add `categorizeWithAi` field
- `packages/backend/src/controllers/import-export/execute-import.controller.ts` — extend Zod schema
- `packages/backend/src/services/import-export/csv-import/csv-import-queue.ts` — add field to job data, pass to worker, queue categorization
- `packages/backend/src/services/import-export/csv-import/execute-import.e2e.ts` — add test cases
- `packages/frontend/src/api/import-export.ts` — no changes needed (already uses `ExecuteImportRequest`)
- `packages/frontend/src/stores/import-export.ts` — pass `categorizeWithAi` in `executeImport`
- `packages/frontend/src/pages/import-export/components/review-duplicates-step/index.vue` — add toggle UI
- `packages/frontend/src/pages/import-export/components/import-execute-step/index.vue` — show status when AI categorization is queued

**Out of scope** (do NOT touch, even though they look related):
- `packages/backend/src/services/ai-categorization/` — the categorization system itself is already built and tested
- `packages/backend/src/services/import-export/statement-parser/` — that path already has categorization wired; changing it risks the working flow
- Any YNAB or Budget Bakers importer — they have their own flow
- `packages/frontend/src/pages/settings/` — AI settings are already done

## Steps

### Step 1: Add `categorizeWithAi` to shared types

In `packages/shared/src/types/import-export.ts`, add the field to `ExecuteImportRequest`:

```typescript
export interface ExecuteImportRequest {
  // ...existing fields...
  /**
   * When true, the import worker queues AI categorization for the newly created
   * transactions after the import completes. Defaults to false so users who
   * already mapped categories from the CSV column don't get surprised by AI
   * overwriting them.
   */
  categorizeWithAi?: boolean;
}
```

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 2: Extend the controller Zod schema

In `packages/backend/src/controllers/import-export/execute-import.controller.ts`, add to the body schema object (after `timezone: z.string().optional()`):

```typescript
categorizeWithAi: z.boolean().optional(),
```

Then destructure it from `body` and pass it to `queueCsvImport`:

```typescript
const { ..., categorizeWithAi } = body; // add to destructuring

const jobId = await queueCsvImport({
  // ...existing params...
  categorizeWithAi,
});
```

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 3: Thread the flag through the queue and worker

In `packages/backend/src/services/import-export/csv-import/csv-import-queue.ts`:

3a. Add `categorizeWithAi?: boolean` to `CsvImportJobData` interface.

3b. In `processJob`, pass it to `executeImport`. Change:
```typescript
return executeImport({ userId, validRows, ... });
```
to:
```typescript
const summary = await executeImport({ userId, validRows, ... });

return summary;
```

3c. After `executeImport` returns, conditionally queue categorization. Add this pattern right after the `// Re-parse server-side ...` block and before `return`:

```typescript
// Re-parse server-side...
const { validRows } = await parseValidRows({ ... });

const result = await executeImport({ userId, validRows, ... });

// Queue AI categorization when the user opted in and transactions were created
if (job.data.categorizeWithAi && result.newTransactionIds.length > 0) {
  // Fire-and-forget: a failure to queue categorization must not fail the import.
  // The categorization queue handles its own retries internally.
  try {
    const { queueCategorizationJob } = await import('@services/ai-categorization');
    await queueCategorizationJob({
      userId,
      transactionIds: result.newTransactionIds,
    });
  } catch (err) {
    logger.error({
      message: '[CSV Import] Failed to queue AI categorization after import',
      error: err as Error,
    });
  }
}

return result;
```

Note: `@services/ai-categorization` must be imported — add at the top:
```typescript
import { logger } from '@js/utils/logger';
```

The dynamic import is intentional — it keeps the categorization dependency optional at runtime. If the AI module fails to load (e.g. env misconfiguration), the import still succeeds without the categorization job. If the static import is preferred for simplicity, use it — but wrap in try/catch either way.

3d. In `queueCsvImport` function signature and the data object:
```typescript
// Add to params interface
categorizeWithAi?: boolean;

// Add to data object
categorizeWithAi,
```

**Verify**: `npm -w packages/backend run typecheck` exits 0.

### Step 4: Add toggle to the frontend review step

In `packages/frontend/src/pages/import-export/components/review-duplicates-step/index.vue`:

4a. Add a checkbox between the import summary line (around line 178) and the import error callout (line 181). Use the same pattern as the project's Checkbox component:

```vue
<!-- AI categorization toggle — shown only when user has AI configured -->
<div class="flex items-start gap-3">
  <Checkbox
    id="categorize-with-ai"
    v-model="categorizeWithAi"
  />
  <label for="categorize-with-ai" class="text-sm leading-snug cursor-pointer">
    <span class="font-medium">
      {{ $t('pages.importExport.csvImport.review.categorizeWithAi') }}
    </span>
    <p class="text-muted-foreground text-xs">
      {{ $t('pages.importExport.csvImport.review.categorizeWithAiHint') }}
    </p>
  </label>
</div>
```

Import `Checkbox` from `@/components/lib/ui/checkbox`.

4b. Add a `categorizeWithAi` ref:
```typescript
import { ref } from 'vue';

const categorizeWithAi = ref(false);
```

4c. Pass it to `executeImport` calls. Change:
```typescript
const handleExecuteImport = async () => {
  await store.executeImport();
};
```
to:
```typescript
const handleExecuteImport = async () => {
  await store.executeImport({ categorizeWithAi: categorizeWithAi.value });
};
```

And change `handleSkipAndImport` similarly:
```typescript
const handleSkipAndImport = async () => {
  const skipUnpriceableIndices = store.unpriceableRows.map((r) => r.rowIndex);
  await store.executeImport({ skipUnpriceableIndices, categorizeWithAi: categorizeWithAi.value });
};
```

**Verify**: `npm -w packages/frontend run typecheck` exits 0.

### Step 5: Pass the flag through the store

In `packages/frontend/src/stores/import-export.ts`, update the `executeImport` function (line 572):

5a. Update the function signature to accept `categorizeWithAi`:
```typescript
const executeImport = async (
  { skipUnpriceableIndices, categorizeWithAi }:
  { skipUnpriceableIndices?: number[]; categorizeWithAi?: boolean } = {}
) => {
```

5b. Add it to the API call payload object (around line 597-610):
```typescript
response = await executeImportApi({
  fileContent: fileContent.value!,
  // ...existing fields...
  categorizeWithAi,
});
```

**Verify**: `npm -w packages/frontend run typecheck` exits 0.

### Step 6: Show categorization status on import results

In `packages/frontend/src/pages/import-export/components/import-execute-step/index.vue`, after the progress bar section (around line 37), add a note when AI categorization was requested:

```vue
<Callout v-if="categorizeWithAi && progress?.status === 'completed'" variant="info" class="mt-4">
  <p>{{ $t('pages.importExport.csvImport.execute.aiCategorizationQueued') }}</p>
</Callout>
```

Add the prop:
```typescript
import { useImportExportStore } from '@/stores/import-export';
const store = useImportExportStore();
const categorizeWithAi = computed(() => store.categorizeWithAi);
```

Add `categorizeWithAi` to the store state (in `packages/frontend/src/stores/import-export.ts`):
```typescript
const categorizeWithAi = ref(false);

// In executeImport, set it:
categorizeWithAi.value = categorizeWithAi ?? false;
```

And export it:
```typescript
return {
  // ...existing exports...
  categorizeWithAi,
};
```

**Verify**: `npm -w packages/frontend run typecheck` exits 0.

### Step 7: Add i18n keys

Use the `i18n-editor` subagent per project rule #7. Add these keys to all locale files:

| Key | English value |
|-----|---------------|
| `pages.importExport.csvImport.review.categorizeWithAi` | "Auto-categorize with AI" |
| `pages.importExport.csvImport.review.categorizeWithAiHint` | "Transactions without a category will be analyzed and assigned one by AI" |
| `pages.importExport.csvImport.execute.aiCategorizationQueued` | "AI categorization has been queued for the imported transactions" |

**Verify**: `npm run typecheck` exits 0. Run frontend tests: `npm -w packages/frontend run test`.

## Test plan

Add tests to `packages/backend/src/services/import-export/csv-import/execute-import.e2e.ts`:

1. **Happy path — categorization queued when flag is true**: Submit an import with `categorizeWithAi: true`. After the import completes, verify the AI categorization queue has a job for the new transaction IDs. Model after the existing statement-parser pattern in `packages/backend/src/services/import-export/statement-parser/execute-import.service.ts:200-211`. Since the AI categorization queue calls an actual LLM (skipped in CI unless mock key is set), verify the *queueing* happened (check the BullMQ queue state or mock `queueCategorizationJob`).

2. **No categorization when flag is false/absent**: Default behavior — existing test cases already cover this; just confirm they still pass. The flag defaults to false/undefined.

3. **No categorization when import creates zero transactions**: When all rows are skipped/duplicates, `categorizeWithAi: true` must not queue a job for an empty list.

The simplest approach: mock `queueCategorizationJob` in the e2e test setup (see `packages/backend/src/services/ai-categorization/event-listeners.unit.ts:19` for the mock pattern), then assert it was called with the right `transactionIds` when `categorizeWithAi: true` and NOT called when it's false/absent.

**Verify**: `npm -w packages/backend run test:e2e -- --testPathPattern='csv-import/execute-import'` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm -w packages/backend run typecheck` exits 0
- [ ] `npm -w packages/frontend run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm -w packages/backend run test:e2e -- --testPathPattern='csv-import/execute-import'` all pass
- [ ] `npm -w packages/frontend run test` all pass
- [ ] New i18n keys exist in `en`, `uk`, `es` locale files
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at any location in "Current state" doesn't match the excerpts (codebase drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The change requires touching an out-of-scope file.
- The `queueCategorizationJob` import path or signature has changed (check `packages/backend/src/services/ai-categorization/index.ts` and `categorization-queue.ts:146`).
- The `import()` dynamic import approach causes lint/type issues — in that case switch to a static top-level import.

## Maintenance notes

- If the AI categorization defaults or feature detection changes (e.g., the system starts auto-categorizing all uncategorized transactions), this toggle may become redundant — check whether the new behavior already covers CSV imports.
- The toggle is on the "review" step (before import runs), not after. This matches user expectation: decide once, then watch progress. If users want to retroactively categorize an already-imported batch, a "re-categorize" button on the results step is a natural follow-up (deferred from this plan).
- The fire-and-forget pattern (try/catch around queueCategorizationJob) means a categorization queue failure doesn't roll back the import. This matches the statement-parser behavior.
