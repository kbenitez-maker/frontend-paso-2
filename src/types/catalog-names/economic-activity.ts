/** Catalogs only the economic-activity step uses (names as the API serves them). */
const ECONOMIC_ACTIVITY_CATALOG_NAMES = [
  'company-sectors',
  'business-activities',
  'economic-sectors',
  'distribution-types',
  'economic-activity-categories',
  'economic-activity-subcategories',
  'operations-profiles',
  'rtbf-statuses',
  'stock-exchanges',
  'income-sources',
  'other-financial-institutions',
  'other-institution-account-types',
  'counterparty-person-types',
  'license-trade-directions',
  'license-cargo-types',
  'license-transport-modes',
] as const;

export { ECONOMIC_ACTIVITY_CATALOG_NAMES };
