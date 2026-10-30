import { BANCANET_CATALOG_NAMES } from './catalog-names/bancanet';
import { ECONOMIC_ACTIVITY_CATALOG_NAMES } from './catalog-names/economic-activity';
import { REFERENCES_ACCOUNTS_CATALOG_NAMES } from './catalog-names/references-accounts';
import { RELATED_PARTIES_CATALOG_NAMES } from './catalog-names/related-parties';

const BANK_IDS = ['BLNI', 'BLPA', 'BLCR', 'BLHN', 'BLSV', 'BLRD'] as const;

type BankId = (typeof BANK_IDS)[number];

const BANK_ID_VALUES: readonly unknown[] = BANK_IDS;

const isBankId = (value: unknown): value is BankId =>
  BANK_ID_VALUES.includes(value);

const COUNTRY_CODES = ['NI', 'PA', 'CR', 'HN', 'SV', 'DO'] as const;

type CountryCode = (typeof COUNTRY_CODES)[number];

const COUNTRY_CODE_VALUES: readonly unknown[] = COUNTRY_CODES;

const isCountryCode = (value: unknown): value is CountryCode =>
  COUNTRY_CODE_VALUES.includes(value);

/** `dxb_app.country.country_code` (ISO 3166-1 alpha-3), as the banks API returns it. */
const ALPHA3_BY_COUNTRY = {
  NI: 'NIC',
  PA: 'PAN',
  CR: 'CRI',
  HN: 'HND',
  SV: 'SLV',
  DO: 'DOM',
} as const satisfies Record<CountryCode, string>;

const COUNTRY_BY_ALPHA3 = new Map<string, CountryCode>(
  COUNTRY_CODES.map(
    (code) =>
      // eslint-disable-next-line security/detect-object-injection -- code is one of COUNTRY_CODES
      [ALPHA3_BY_COUNTRY[code], code] as const,
  ),
);

/** Zone country code for an alpha-2 or alpha-3 code; `undefined` when unsupported. */
const toCountryCode = (value: string): CountryCode | undefined =>
  isCountryCode(value) ? value : COUNTRY_BY_ALPHA3.get(value);

const PERSON_TYPES = ['legal', 'natural'] as const;

type PersonType = (typeof PERSON_TYPES)[number];

/**
 * Roles a person registered in the request holds (related parties, and the
 * customers and suppliers of the economic activity): the filter of the lists
 * that pick one of them (`GET account-requests/{id}/related-persons?role=`).
 */
const RELATED_PERSON_ROLES = [
  'legal-representative',
  'attorney-in-fact',
  'signatory',
  'board',
  'shareholder',
  'settlor',
  'beneficiary',
  'trust-manager',
  'client',
  'supplier',
] as const;

type RelatedPersonRole = (typeof RELATED_PERSON_ROLES)[number];

/** Shared and company catalogs; each later step appends its own list from `catalog-names/`. */
const CATALOG_NAMES = [
  'countries',
  'regional-countries',
  'currencies',
  'economic-activities',
  'legal-entity-types',
  'identification-types',
  'branches',
  'constitution-reform-types',
  'share-types',
  'cicac-refusal-reasons',
  'genders',
  'company-categories',
  'operational-coverages',
  'departments',
  'provinces',
  'municipalities',
  'sectors',
  'cantons',
  'districts',
  'subdistricts',
  'free-trade-zones',
  ...ECONOMIC_ACTIVITY_CATALOG_NAMES,
  ...RELATED_PARTIES_CATALOG_NAMES,
  ...REFERENCES_ACCOUNTS_CATALOG_NAMES,
  ...BANCANET_CATALOG_NAMES,
] as const;

type CatalogName = (typeof CATALOG_NAMES)[number];

const CATALOG_NAME_VALUES: readonly unknown[] = CATALOG_NAMES;

const isCatalogName = (value: unknown): value is CatalogName =>
  CATALOG_NAME_VALUES.includes(value);

/** App-internal path (no basePath). Built only in `@/lib/routes`. */
type Route = `/${string}`;

export {
  BANK_IDS,
  CATALOG_NAMES,
  COUNTRY_CODES,
  isBankId,
  isCatalogName,
  PERSON_TYPES,
  RELATED_PERSON_ROLES,
  toCountryCode,
  type BankId,
  type CatalogName,
  type CountryCode,
  type PersonType,
  type RelatedPersonRole,
  type Route,
};
