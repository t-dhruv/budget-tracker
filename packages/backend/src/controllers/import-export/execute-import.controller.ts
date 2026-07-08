import { recordId } from '@common/lib/zod/custom-types';
import { createController } from '@controllers/helpers/controller-factory';
import { queueCsvImport } from '@services/import-export/csv-import/csv-import-queue';
import { z } from 'zod';

import {
  accountMappingValueSchema,
  categoryMappingValueSchema,
  columnMappingConfigSchema,
  importExecuteRequestBaseSchema,
  tagMappingValueSchema,
} from './shared-schemas';

export const executeImportController = createController(
  z.object({
    body: z.object({
      fileContent: z.string(),
      delimiter: z.string(),
      columnMapping: columnMappingConfigSchema,
      accountMapping: z.record(z.string(), accountMappingValueSchema),
      categoryMapping: z.record(z.string(), categoryMappingValueSchema),
      tagMapping: z.record(z.string(), tagMappingValueSchema).optional(),
      skipDuplicateIndices: z.array(z.number()),
      skipUnpriceableIndices: z.array(z.number()).optional(),
      defaultAccountId: recordId().optional(),
      defaultCategoryId: recordId().optional(),
      timezone: z.string().optional(),
<<<<<<< HEAD
      // Shared balance-recalculation fields (`recalculateBalance`), tied to
      // `ImportExecuteRequestBase` by a drift guard in `./shared-schemas`.
      ...importExecuteRequestBaseSchema.shape,
=======
      categorizeWithAi: z.boolean().optional(),
>>>>>>> bd077a99 (feat(csv-import): add AI auto-categorization toggle)
    }),
  }),
  async ({ user, body }) => {
    const {
      fileContent,
      delimiter,
      columnMapping,
      accountMapping,
      categoryMapping,
      tagMapping,
      skipDuplicateIndices,
      skipUnpriceableIndices,
      defaultAccountId,
      defaultCategoryId,
      timezone,
<<<<<<< HEAD
      recalculateBalance,
=======
      categorizeWithAi,
>>>>>>> bd077a99 (feat(csv-import): add AI auto-categorization toggle)
    } = body;

    const jobId = await queueCsvImport({
      userId: user.id,
      fileContent,
      delimiter,
      columnMapping,
      accountMapping,
      categoryMapping,
      tagMapping,
      skipDuplicateIndices,
      skipUnpriceableIndices,
      defaultAccountId,
      defaultCategoryId,
      timezone,
<<<<<<< HEAD
      recalculateBalance,
=======
      categorizeWithAi,
>>>>>>> bd077a99 (feat(csv-import): add AI auto-categorization toggle)
    });

    return {
      data: { jobId },
    };
  },
);
