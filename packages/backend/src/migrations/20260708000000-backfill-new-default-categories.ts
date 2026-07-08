import { QueryInterface, Transaction } from 'sequelize';

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

const NEW_MAIN_CATEGORIES: NewMainCategory[] = [
  { key: 'health', name: 'Health & Medical', type: 'custom', color: '#1abc9c', icon: 'stethoscope-20-filled' },
  { key: 'education', name: 'Education', type: 'custom', color: '#9b59b6', icon: 'hat-graduation-20-filled' },
  { key: 'pets', name: 'Pets', type: 'custom', color: '#e67e22', icon: 'animal-dog-20-filled' },
  { key: 'subscriptions', name: 'Subscriptions', type: 'custom', color: '#34495e', icon: 'calendar-20-filled' },
];

const NEW_SUBCATEGORIES: NewSubCategory[] = [
  { parentKey: 'health', key: 'health-insurance-premiums', name: 'Health insurance premiums', type: 'custom', icon: 'shield-20-filled' },
  { parentKey: 'health', key: 'doctor-visits', name: 'Doctor visits', type: 'custom', icon: 'stethoscope-20-filled' },
  { parentKey: 'health', key: 'hospital-surgery', name: 'Hospital & surgery', type: 'custom', icon: 'building-hospital-20-filled' },
  { parentKey: 'health', key: 'prescriptions', name: 'Prescriptions', type: 'custom', icon: 'pill-20-filled' },
  { parentKey: 'health', key: 'dental', name: 'Dental', type: 'custom', icon: 'tooth-20-filled' },
  { parentKey: 'health', key: 'vision', name: 'Vision', type: 'custom', icon: 'eye-20-filled' },
  { parentKey: 'health', key: 'therapy-counseling', name: 'Therapy & counseling', type: 'custom', icon: 'brain-20-filled' },
  { parentKey: 'health', key: 'health-wellness-other', name: 'Other health & wellness', type: 'custom', icon: 'heart-pulse-20-filled' },
  { parentKey: 'education', key: 'tuition-school', name: 'Tuition & school fees', type: 'custom', icon: 'building-library-20-filled' },
  { parentKey: 'education', key: 'courses-certifications', name: 'Courses & certifications', type: 'custom', icon: 'certificate-20-filled' },
  { parentKey: 'education', key: 'books-supplies', name: 'Books & supplies', type: 'custom', icon: 'book-20-filled' },
  { parentKey: 'education', key: 'student-loan-payments', name: 'Student loan payments', type: 'custom', icon: 'money-20-filled' },
  { parentKey: 'education', key: 'childcare-daycare', name: 'Childcare & daycare', type: 'custom', icon: 'people-20-filled' },
  { parentKey: 'education', key: 'tutoring-extra-lessons', name: 'Tutoring & extra lessons', type: 'custom', icon: 'hat-graduation-20-filled' },
  { parentKey: 'pets', key: 'pet-food', name: 'Pet food', type: 'custom', icon: 'cart-20-filled' },
  { parentKey: 'pets', key: 'vet-care', name: 'Vet care', type: 'custom', icon: 'stethoscope-20-filled' },
  { parentKey: 'pets', key: 'grooming', name: 'Grooming', type: 'custom', icon: 'cut-20-filled' },
  { parentKey: 'pets', key: 'pet-supplies', name: 'Pet supplies', type: 'custom', icon: 'shopping-bag-20-filled' },
  { parentKey: 'pets', key: 'boarding-sitting', name: 'Boarding & sitting', type: 'custom', icon: 'building-20-filled' },
  { parentKey: 'pets', key: 'pet-insurance', name: 'Pet insurance', type: 'custom', icon: 'shield-20-filled' },
  { parentKey: 'subscriptions', key: 'cloud-storage', name: 'Cloud storage', type: 'custom', icon: 'cloud-20-filled' },
  { parentKey: 'subscriptions', key: 'news-magazines', name: 'News & magazines', type: 'custom', icon: 'news-20-filled' },
  { parentKey: 'subscriptions', key: 'productivity-saas', name: 'Productivity SaaS', type: 'custom', icon: 'apps-20-filled' },
  { parentKey: 'subscriptions', key: 'membership-clubs', name: 'Membership clubs', type: 'custom', icon: 'people-community-20-filled' },
  { parentKey: 'subscriptions', key: 'streaming-video', name: 'Streaming (video)', type: 'custom', icon: 'video-20-filled' },
  { parentKey: 'subscriptions', key: 'streaming-music', name: 'Streaming (music)', type: 'custom', icon: 'music-note-2-20-filled' },
  { parentKey: 'food', key: 'meal-delivery', name: 'Meal delivery', type: 'custom', icon: 'food-20-filled' },
  { parentKey: 'food', key: 'takeout', name: 'Takeout', type: 'custom', icon: 'food-takeout-20-filled' },
  { parentKey: 'housing', key: 'hoa-strata-fees', name: 'HOA / strata fees', type: 'custom', icon: 'building-government-20-filled' },
  { parentKey: 'housing', key: 'property-tax', name: 'Property tax', type: 'custom', icon: 'calculator-20-filled' },
  { parentKey: 'housing', key: 'furniture-appliances', name: 'Furniture & appliances', type: 'custom', icon: 'table-20-filled' },
  { parentKey: 'housing', key: 'moving-relocation', name: 'Moving & relocation', type: 'custom', icon: 'box-20-filled' },
  { parentKey: 'transportation', key: 'tolls', name: 'Tolls', type: 'custom', icon: 'road-20-filled' },
  { parentKey: 'transportation', key: 'rideshare', name: 'Rideshare', type: 'custom', icon: 'vehicle-cab-20-filled' },
  { parentKey: 'investments', key: 'retirement-401k-ira', name: 'Retirement (401k/IRA)', type: 'custom', icon: 'safe-20-filled' },
  { parentKey: 'investments', key: 'index-funds-etfs', name: 'Index funds & ETFs', type: 'custom', icon: 'chart-20-filled' },
  { parentKey: 'financial-expenses', key: 'banking-fees', name: 'Banking fees', type: 'custom', icon: 'receipt-money-20-filled' },
  { parentKey: 'financial-expenses', key: 'late-payment-fees', name: 'Late payment fees', type: 'custom', icon: 'gavel-20-filled' },
  { parentKey: 'income', key: 'bonus-commission', name: 'Bonus & commission', type: 'custom', icon: 'money-hand-20-filled' },
  { parentKey: 'income', key: 'tips-gratuity', name: 'Tips & gratuity', type: 'custom', icon: 'hand-wave-20-filled' },
  { parentKey: 'income', key: 'side-hustle', name: 'Side hustle', type: 'custom', icon: 'briefcase-20-filled' },
  { parentKey: 'income', key: 'social-security-pension', name: 'Social Security / pension', type: 'custom', icon: 'person-20-filled' },
  { parentKey: 'income', key: 'government-benefits', name: 'Government benefits', type: 'custom', icon: 'building-government-20-filled' },
];

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const t: Transaction = await queryInterface.sequelize.transaction();

    try {
      for (const cat of NEW_MAIN_CATEGORIES) {
        await queryInterface.sequelize.query(
          `INSERT INTO "Categories" (id, name, key, icon, color, type, "parentId", "userId")
           SELECT
             gen_random_uuid(), :name, :key, :icon, :color, :type, NULL, u.id
           FROM "Users" u
           WHERE NOT EXISTS (
             SELECT 1 FROM "Categories" c
             WHERE c."userId" = u.id AND c."key" = :key
           )`,
          { replacements: { name: cat.name, key: cat.key, icon: cat.icon, color: cat.color, type: cat.type }, transaction: t },
        );
      }

      for (const sub of NEW_SUBCATEGORIES) {
        await queryInterface.sequelize.query(
          `INSERT INTO "Categories" (id, name, key, icon, color, type, "parentId", "userId")
           SELECT
             gen_random_uuid(), :subName, :subKey, :subIcon, p.color, :subType, p.id, p."userId"
           FROM "Categories" p
           WHERE p."key" = :parentKey
             AND p."parentId" IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM "Categories" c
               WHERE c."userId" = p."userId"
                 AND c."parentId" = p.id
                 AND c."key" = :subKey
             )`,
          { replacements: { parentKey: sub.parentKey, subKey: sub.key, subName: sub.name, subIcon: sub.icon, subType: sub.type }, transaction: t },
        );
      }

      const [mainCountResult] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS total FROM "Categories" WHERE "parentId" IS NULL`,
        { transaction: t },
      ) as unknown as [{ total: number }];
      const [subCountResult] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS total FROM "Categories" WHERE "parentId" IS NOT NULL`,
        { transaction: t },
      ) as unknown as [{ total: number }];

      console.log(
        `[20260708000000] backfilled ${NEW_MAIN_CATEGORIES.length} new main categories and ${NEW_SUBCATEGORIES.length} new subcategories. ` +
        `Total main: ${mainCountResult.total}, total sub: ${subCountResult.total}`,
      );

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const t: Transaction = await queryInterface.sequelize.transaction();

    try {
      for (const cat of NEW_MAIN_CATEGORIES) {
        await queryInterface.sequelize.query(
          `DELETE FROM "Categories" WHERE "key" = :key`,
          { replacements: { key: cat.key }, transaction: t },
        );
      }

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
};
