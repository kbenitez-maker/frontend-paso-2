/** Catalogs only the references-accounts step uses (names as the API serves them). */
const REFERENCES_ACCOUNTS_CATALOG_NAMES = [
  'reference-types',
  'reference-person-kinds',
  'banks',
  'account-types',
  'checking-account-types',
  'account-currencies',
  'initial-deposit-methods',
  'deposit-origins',
  'checkbook-types',
  'funds-origins',
  'account-purposes',
  'main-operations',
  'signature-types',
  'signer-categories',
  'signature-combinations',
] as const;

export { REFERENCES_ACCOUNTS_CATALOG_NAMES };
