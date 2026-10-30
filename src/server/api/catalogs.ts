import type {
  BankId,
  CatalogName,
  CountryCode,
  PersonType,
} from '@/types/domain';
import type { Page } from '@/types/page';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

interface CatalogItem {
  code: string;
  name: string;
  /** Countries only: Compliance does not onboard it online (the applicant must visit a branch). */
  prohibited?: boolean;
}

type CatalogParams<N extends CatalogName = CatalogName> = {
  country?: CountryCode;
  parent_id?: string;
  search?: string;
} & (N extends 'identification-types' ? { person_type?: PersonType }
: { person_type?: never });

/**
 * Query params of a catalog read; `parent_id` filters dependent catalogs.
 * `person_type` applies only to `identification-types`.
 */
const catalogQuery = <N extends CatalogName>(
  bankId: BankId,
  name: N,
  params: CatalogParams<N> = {},
) => {
  const entries: [string, string][] = [];
  if (params.country !== undefined) entries.push(['country', params.country]);
  if (params.parent_id !== undefined)
    entries.push(['parent_id', params.parent_id]);
  if (params.search !== undefined) entries.push(['search', params.search]);
  if (name === 'identification-types') {
    const { person_type: personType } = params;
    if (personType !== undefined) entries.push(['person_type', personType]);
  }
  const query: Record<string, string> = Object.fromEntries(entries);

  return queryAdapter.query<Page<CatalogItem>>({
    queryKey: queryKeys.catalogs.list(bankId, name, query),
    url: endpoints.catalogs.list(bankId, name),
    options: { apiVersion: APIVersion.V1, params: query },
  });
};

export { catalogQuery, type CatalogItem, type CatalogParams };
