import type { CountryCode } from '@/types/domain';
import type { CatalogRef, FieldDefinition } from './types';

import { COUNTRY_CODES } from '@/types/domain';

/** Field the catalog is filtered by in `country`; `undefined` when it is not dependent there. */
const catalogParentOf = (
  catalog: CatalogRef | undefined,
  country: CountryCode,
): string | undefined => {
  const parent = catalog?.parent;
  return typeof parent === 'object' ? parent[country] : parent;
};

/**
 * Country a `country_from` catalog is read for: the sibling's value when it is
 * a bank country, otherwise the request's; `undefined` for any other catalog.
 */
const catalogCountryOf = (
  catalog: CatalogRef | undefined,
  scope: Record<string, unknown>,
  country: CountryCode,
): CountryCode | undefined => {
  if (catalog?.country_from === undefined) return undefined;
  const chosen = scope[catalog.country_from];
  return COUNTRY_CODES.find((code) => code === chosen) ?? country;
};

/** Keys of the fields whose catalog is filtered, directly or through others, by `key`. */
const catalogDependentsOf = (
  fields: readonly FieldDefinition[],
  key: string,
  country: CountryCode,
): string[] => {
  const found: string[] = [];
  const queue = [key];
  for (
    let parent = queue.shift();
    parent !== undefined;
    parent = queue.shift()
  ) {
    for (const field of fields) {
      if (
        (catalogParentOf(field.catalog, country) === parent ||
          field.catalog?.country_from === parent) &&
        !found.includes(field.key)
      ) {
        found.push(field.key);
        queue.push(field.key);
      }
    }
  }
  return found;
};

/** What validation reads from a catalog row. */
interface CatalogFact {
  code: string;
  prohibited?: boolean;
}

/** Rows of a catalog (under `parent`, for a dependent one); `undefined` while unknown. */
type CatalogLookup = (
  name: string,
  parent: string | undefined,
) => readonly CatalogFact[] | undefined;

const seen = new Map<string, readonly CatalogFact[]>();
const keyOf = (name: string, parent: string | undefined) =>
  `${name}:${parent ?? ''}`;

const lookup: CatalogLookup = (name, parent) => seen.get(keyOf(name, parent));

/**
 * The form remembers the catalog rows it reads, so the (synchronous) schema can
 * check them: prohibited countries and dependent catalogs with no rows.
 */
const rememberCatalog = (
  name: string,
  parent: string | undefined,
  rows: readonly CatalogFact[],
): void => {
  seen.set(keyOf(name, parent), rows);
};

/**
 * Whether the countries catalog flags the code `prohibited`. A catalog not read
 * yet flags nothing; the API checks again on save.
 */
const isProhibitedCountry = (code: unknown): boolean =>
  typeof code === 'string' &&
  (lookup('countries', undefined)?.some(
    (row) => row.code === code && row.prohibited === true,
  ) ??
    false);

/**
 * Cache key of a request-scoped catalog (`source: 'request'`): its filter takes
 * the place of the parent, as the same name serves several lists.
 */
const requestFilterOf = (catalog: CatalogRef): string =>
  [...(catalog.roles ?? []), catalog.person_type ?? ''].join(',');

/**
 * Whether a request-scoped catalog is known not to list the chosen person (or
 * one of them): a link the person's removal, or the loss of the role, broke.
 * A list not read yet breaks nothing; the API checks again on completion.
 */
const isUnlisted = (catalog: CatalogRef, value: unknown): boolean => {
  const rows = lookup(catalog.name, requestFilterOf(catalog));
  const chosen = Array.isArray(value) ? value : [value];
  return (
    rows !== undefined &&
    chosen.some(
      (code) =>
        typeof code === 'string' && !rows.some((row) => row.code === code),
    )
  );
};

/** Whether the catalog is known to have no rows under the chosen `parent`. */
const isCatalogEmpty = (name: string, parent: unknown): boolean =>
  typeof parent === 'string' && lookup(name, parent)?.length === 0;

export {
  catalogCountryOf,
  catalogDependentsOf,
  catalogParentOf,
  isCatalogEmpty,
  isProhibitedCountry,
  isUnlisted,
  rememberCatalog,
  requestFilterOf,
  type CatalogFact,
};
