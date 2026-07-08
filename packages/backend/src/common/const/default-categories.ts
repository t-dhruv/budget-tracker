import { CATEGORY_TYPES } from '@bt/shared/types';
import { t } from '@i18n/index';
import { logger } from '@js/utils/logger';

/**
 * Stable, user-locale-independent identifiers for the seeded default categories.
 *
 * The string values serve a dual purpose:
 *   1. **i18n lookup key** at seed time, e.g. `defaultCategories.main.financial-expenses`.
 *   2. **Persisted identity** on the resulting `Categories.key` column. The value is stamped
 *      on every seeded category row and survives renames and locale changes. Downstream
 *      features (notably cross-user category merging in shared-account stats) rely on this
 *      key to merge equivalent categories across households whose users speak different
 *      languages or who renamed the seeded category.
 *
 * Values are **kebab-case**. Don't change them once shipped without a migration plan —
 * existing rows reference these keys by value.
 *
 * The TS property names (`financialExpenses`) stay camelCase for ergonomic in-code access;
 * only the string values are persisted / used as i18n paths.
 */
const CATEGORY_KEYS = Object.freeze({
  food: 'food',
  shopping: 'shopping',
  housing: 'housing',
  transportation: 'transportation',
  vehicle: 'vehicle',
  life: 'life',
  communication: 'communication',
  financialExpenses: 'financial-expenses',
  investments: 'investments',
  income: 'income',
  other: 'other',
  health: 'health',
  education: 'education',
  pets: 'pets',
  subscriptions: 'subscriptions',
} as const);

/**
 * Seed structure for default categories and subcategories.
 *
 * Each `key` is a kebab-case identifier with the dual purpose documented on `CATEGORY_KEYS`:
 * it's the i18n lookup segment AND the persisted `Categories.key` value. Stable across
 * renames and locales, used by stats/sharing features to merge equivalent categories.
 *
 * `parentKey` references the parent's `key` (also kebab-case).
 */
const DEFAULT_CATEGORY_STRUCTURE = Object.freeze({
  main: [
    { key: CATEGORY_KEYS.food, type: CATEGORY_TYPES.custom, color: '#e74c3c', icon: 'food-20-filled' },
    { key: CATEGORY_KEYS.shopping, type: CATEGORY_TYPES.custom, color: '#3498db', icon: 'shopping-bag-20-filled' },
    { key: CATEGORY_KEYS.housing, type: CATEGORY_TYPES.custom, color: '#e67e22', icon: 'home-20-filled' },
    { key: CATEGORY_KEYS.transportation, type: CATEGORY_TYPES.custom, color: '#95a5a6', icon: 'vehicle-bus-20-filled' },
    { key: CATEGORY_KEYS.vehicle, type: CATEGORY_TYPES.custom, color: '#8e44ad', icon: 'vehicle-car-20-filled' },
    { key: CATEGORY_KEYS.life, type: CATEGORY_TYPES.custom, color: '#2ecc71', icon: 'heart-20-filled' },
    { key: CATEGORY_KEYS.communication, type: CATEGORY_TYPES.custom, color: '#2980b9', icon: 'phone-20-filled' },
    { key: CATEGORY_KEYS.financialExpenses, type: CATEGORY_TYPES.custom, color: '#16a085', icon: 'receipt-20-filled' },
    { key: CATEGORY_KEYS.investments, type: CATEGORY_TYPES.custom, color: '#fda7df', icon: 'arrow-trending-20-filled' },
    { key: CATEGORY_KEYS.income, type: CATEGORY_TYPES.custom, color: '#f1c40f', icon: 'wallet-20-filled' },
    { key: CATEGORY_KEYS.health, type: CATEGORY_TYPES.custom, color: '#1abc9c', icon: 'stethoscope-20-filled' },
    { key: CATEGORY_KEYS.education, type: CATEGORY_TYPES.custom, color: '#9b59b6', icon: 'hat-graduation-20-filled' },
    { key: CATEGORY_KEYS.pets, type: CATEGORY_TYPES.custom, color: '#e67e22', icon: 'animal-dog-20-filled' },
    { key: CATEGORY_KEYS.subscriptions, type: CATEGORY_TYPES.custom, color: '#34495e', icon: 'calendar-20-filled' },
    { key: CATEGORY_KEYS.other, type: CATEGORY_TYPES.internal, color: '#7f8c8d', icon: 'more-horizontal-20-filled' },
  ],
  subcategories: [
    {
      parentKey: CATEGORY_KEYS.food,
      values: [
        { key: 'groceries', type: CATEGORY_TYPES.custom, icon: 'cart-20-filled' },
        { key: 'restaurant', type: CATEGORY_TYPES.custom, icon: 'food-pizza-20-filled' },
        { key: 'bar-cafe', type: CATEGORY_TYPES.custom, icon: 'drink-coffee-20-filled' },
        { key: 'meal-delivery', type: CATEGORY_TYPES.custom, icon: 'food-20-filled' },
        { key: 'takeout', type: CATEGORY_TYPES.custom, icon: 'food-takeout-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.shopping,
      values: [
        { key: 'clothes-shoes', type: CATEGORY_TYPES.custom, icon: 'clothes-hanger-20-filled' },
        { key: 'jewels-accessories', type: CATEGORY_TYPES.custom, icon: 'diamond-20-filled' },
        { key: 'personal-care', type: CATEGORY_TYPES.custom, icon: 'sparkle-20-filled' },
        { key: 'kids', type: CATEGORY_TYPES.custom, icon: 'people-20-filled' },
        { key: 'home-garden', type: CATEGORY_TYPES.custom, icon: 'plant-grass-20-filled' },
        { key: 'electronics-accessories', type: CATEGORY_TYPES.custom, icon: 'laptop-20-filled' },
        { key: 'gifts-joy', type: CATEGORY_TYPES.custom, icon: 'gift-20-filled' },
        { key: 'stationery-tools', type: CATEGORY_TYPES.custom, icon: 'pen-20-filled' },
        { key: 'free-time', type: CATEGORY_TYPES.custom, icon: 'games-20-filled' },
        { key: 'drugstore-chemist', type: CATEGORY_TYPES.custom, icon: 'pill-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.housing,
      values: [
        { key: 'rent', type: CATEGORY_TYPES.custom, icon: 'key-20-filled' },
        { key: 'mortgage', type: CATEGORY_TYPES.custom, icon: 'building-bank-20-filled' },
        { key: 'energy-utilities', type: CATEGORY_TYPES.custom, icon: 'flash-20-filled' },
        { key: 'services', type: CATEGORY_TYPES.custom, icon: 'wrench-20-filled' },
        { key: 'maintenance-repairs', type: CATEGORY_TYPES.custom, icon: 'toolbox-20-filled' },
        { key: 'property-insurance', type: CATEGORY_TYPES.custom, icon: 'shield-20-filled' },
        { key: 'hoa-strata-fees', type: CATEGORY_TYPES.custom, icon: 'building-government-20-filled' },
        { key: 'property-tax', type: CATEGORY_TYPES.custom, icon: 'calculator-20-filled' },
        { key: 'furniture-appliances', type: CATEGORY_TYPES.custom, icon: 'table-20-filled' },
        { key: 'moving-relocation', type: CATEGORY_TYPES.custom, icon: 'box-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.transportation,
      values: [
        { key: 'public-transport', type: CATEGORY_TYPES.custom, icon: 'ticket-20-filled' },
        { key: 'taxi', type: CATEGORY_TYPES.custom, icon: 'vehicle-cab-20-filled' },
        { key: 'long-distance', type: CATEGORY_TYPES.custom, icon: 'airplane-20-filled' },
        { key: 'business-trips', type: CATEGORY_TYPES.custom, icon: 'briefcase-20-filled' },
        { key: 'tolls', type: CATEGORY_TYPES.custom, icon: 'road-20-filled' },
        { key: 'rideshare', type: CATEGORY_TYPES.custom, icon: 'vehicle-cab-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.vehicle,
      values: [
        { key: 'fuel', type: CATEGORY_TYPES.custom, icon: 'gas-pump-20-filled' },
        { key: 'parking', type: CATEGORY_TYPES.custom, icon: 'vehicle-car-parking-20-filled' },
        { key: 'vehicle-maintenance', type: CATEGORY_TYPES.custom, icon: 'toolbox-20-filled' },
        { key: 'rentals', type: CATEGORY_TYPES.custom, icon: 'key-20-filled' },
        { key: 'vehicle-insurance', type: CATEGORY_TYPES.custom, icon: 'shield-20-filled' },
        { key: 'leasing', type: CATEGORY_TYPES.custom, icon: 'document-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.life,
      values: [
        { key: 'health-care-doctor', type: CATEGORY_TYPES.custom, icon: 'stethoscope-20-filled' },
        { key: 'wellness-beauty', type: CATEGORY_TYPES.custom, icon: 'sparkle-20-filled' },
        { key: 'active-sport-fitness', type: CATEGORY_TYPES.custom, icon: 'sport-20-filled' },
        { key: 'culture-sport-events', type: CATEGORY_TYPES.custom, icon: 'ticket-20-filled' },
        { key: 'hobbies', type: CATEGORY_TYPES.custom, icon: 'puzzle-piece-20-filled' },
        { key: 'education-development', type: CATEGORY_TYPES.custom, icon: 'hat-graduation-20-filled' },
        { key: 'books-audio-subscriptions', type: CATEGORY_TYPES.custom, icon: 'book-20-filled' },
        { key: 'tv-streaming', type: CATEGORY_TYPES.custom, icon: 'tv-20-filled' },
        { key: 'holiday-trips-hotels', type: CATEGORY_TYPES.custom, icon: 'beach-20-filled' },
        { key: 'charity-donations', type: CATEGORY_TYPES.custom, icon: 'heart-20-filled' },
        { key: 'alcohol-tobacco', type: CATEGORY_TYPES.custom, icon: 'drink-wine-20-filled' },
        { key: 'lottery-gambling', type: CATEGORY_TYPES.custom, icon: 'games-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.communication,
      values: [
        { key: 'phone-cell-phone', type: CATEGORY_TYPES.custom, icon: 'call-20-filled' },
        { key: 'internet', type: CATEGORY_TYPES.custom, icon: 'globe-20-filled' },
        { key: 'software-apps-games', type: CATEGORY_TYPES.custom, icon: 'apps-20-filled' },
        { key: 'postal-services', type: CATEGORY_TYPES.custom, icon: 'mail-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.financialExpenses,
      values: [
        { key: 'taxes', type: CATEGORY_TYPES.custom, icon: 'calculator-20-filled' },
        { key: 'insurances', type: CATEGORY_TYPES.custom, icon: 'shield-20-filled' },
        { key: 'loan-interests', type: CATEGORY_TYPES.custom, icon: 'money-20-filled' },
        { key: 'fines', type: CATEGORY_TYPES.custom, icon: 'gavel-20-filled' },
        { key: 'advisory', type: CATEGORY_TYPES.custom, icon: 'person-support-20-filled' },
        { key: 'charges-fees', type: CATEGORY_TYPES.custom, icon: 'receipt-money-20-filled' },
        { key: 'child-support', type: CATEGORY_TYPES.custom, icon: 'people-20-filled' },
        { key: 'banking-fees', type: CATEGORY_TYPES.custom, icon: 'receipt-money-20-filled' },
        { key: 'late-payment-fees', type: CATEGORY_TYPES.custom, icon: 'gavel-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.investments,
      values: [
        { key: 'realty', type: CATEGORY_TYPES.custom, icon: 'building-20-filled' },
        { key: 'vehicles-chattels', type: CATEGORY_TYPES.custom, icon: 'vehicle-car-20-filled' },
        { key: 'financial-investments', type: CATEGORY_TYPES.custom, icon: 'chart-multiple-20-filled' },
        { key: 'savings', type: CATEGORY_TYPES.custom, icon: 'wallet-credit-card-20-filled' },
        { key: 'collections', type: CATEGORY_TYPES.custom, icon: 'bookmark-20-filled' },
        { key: 'retirement-401k-ira', type: CATEGORY_TYPES.custom, icon: 'safe-20-filled' },
        { key: 'index-funds-etfs', type: CATEGORY_TYPES.custom, icon: 'chart-20-filled' },
      ],
    },
    {
      parentKey: CATEGORY_KEYS.income,
      values: [
        { key: 'wage-invoices', type: CATEGORY_TYPES.custom, icon: 'money-20-filled' },
        { key: 'interests-dividends', type: CATEGORY_TYPES.custom, icon: 'money-calculator-20-filled' },
        { key: 'sale', type: CATEGORY_TYPES.custom, icon: 'tag-20-filled' },
        { key: 'rental-income', type: CATEGORY_TYPES.custom, icon: 'building-20-filled' },
        { key: 'dues-grants', type: CATEGORY_TYPES.custom, icon: 'certificate-20-filled' },
        { key: 'lending-renting', type: CATEGORY_TYPES.custom, icon: 'handshake-20-filled' },
        { key: 'checks-coupons', type: CATEGORY_TYPES.custom, icon: 'receipt-bag-20-filled' },
        { key: 'lottery-gambling', type: CATEGORY_TYPES.custom, icon: 'games-20-filled' },
        { key: 'refunds', type: CATEGORY_TYPES.custom, icon: 'arrow-undo-20-filled' },
        { key: 'freelance', type: CATEGORY_TYPES.custom, icon: 'briefcase-20-filled' },
        { key: 'bonus-commission', type: CATEGORY_TYPES.custom, icon: 'money-hand-20-filled' },
        { key: 'tips-gratuity', type: CATEGORY_TYPES.custom, icon: 'hand-wave-20-filled' },
        { key: 'side-hustle', type: CATEGORY_TYPES.custom, icon: 'briefcase-20-filled' },
        { key: 'social-security-pension', type: CATEGORY_TYPES.custom, icon: 'person-20-filled' },
        { key: 'government-benefits', type: CATEGORY_TYPES.custom, icon: 'building-government-20-filled' },
        { key: 'gifts', type: CATEGORY_TYPES.custom, icon: 'gift-20-filled' },
      ],
    },
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
  ],
  defaultCategoryKey: CATEGORY_KEYS.other,
});

/**
 * Get translated default categories for a given locale.
 * Returns category structure with names resolved via i18n. Each item's `key` is the same
 * stable identifier persisted on the resulting `Categories.key` row — used by both
 * seeding and any downstream code that needs locale-independent matching.
 */
export function getTranslatedCategories({ locale }: { locale: string }) {
  // Debug: log first translation to verify i18n is working
  const testKey = 'defaultCategories.main.food';
  const testTranslation = t({ key: testKey, locale });
  if (testTranslation === testKey) {
    logger.warn(`i18n translation failed: "${testKey}" returned key instead of translation. Locale: ${locale}`);
  } else {
    logger.info(`i18n working: "${testKey}" -> "${testTranslation}"`);
  }

  return {
    main: DEFAULT_CATEGORY_STRUCTURE.main.map((cat) => ({
      name: t({ key: `defaultCategories.main.${cat.key}`, locale }),
      type: cat.type,
      color: cat.color,
      icon: cat.icon,
      key: cat.key,
    })),
    subcategories: DEFAULT_CATEGORY_STRUCTURE.subcategories.map((subcat) => ({
      parentKey: subcat.parentKey,
      values: subcat.values.map((sub) => ({
        name: t({ key: `defaultCategories.subcategories.${subcat.parentKey}.${sub.key}`, locale }),
        type: sub.type,
        icon: sub.icon,
        key: sub.key,
      })),
    })),
    defaultCategoryKey: DEFAULT_CATEGORY_STRUCTURE.defaultCategoryKey,
  };
}
