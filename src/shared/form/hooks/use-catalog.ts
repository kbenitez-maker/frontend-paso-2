'use client';

import { use, useMemo } from 'react';

import type { CatalogRef } from '@/contracts/types';
import type { CatalogItem, RelatedPersons } from '@/server/api';
import type {
  BankId,
  CatalogName,
  CountryCode,
  PersonType,
} from '@/types/domain';

import { skipToken, useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { rememberCatalog, requestFilterOf } from '@/contracts/catalogs';
import { presentCatalogItems } from '@/lib/catalog';
import { queryKeys } from '@/lib/constants/query-keys';
import { catalogQuery, relatedPersonsQuery } from '@/server/api';
import { isCatalogName } from '@/types/domain';

import { LocalCatalogsContext } from './local-catalogs';
import { RequestScopeContext } from './request-scope';

const NO_OPTIONS: readonly CatalogItem[] = [];

/** The request's people as options: their identity is the code (POC: the link keeps the identification). */
const asOptions =
  () =>
  ({ results }: RelatedPersons): CatalogItem[] =>
    results.map((person) => ({ code: person.id, name: person.name }));

/** Query string of a bank catalog. Omitted keys stay off the request. */
const catalogParamsOf = (
  country: CountryCode | undefined,
  parentValue: string | undefined,
  personType: PersonType | undefined,
  name: CatalogName | undefined,
) => ({
  ...(country === undefined ? {} : { country }),
  ...(parentValue === undefined ? {} : { parent_id: parentValue }),
  ...(name === 'identification-types' && personType !== undefined ?
    { person_type: personType }
  : {}),
});

/** Bank catalog request, absent when the bank or the portal name is unknown. */
const listedCatalogQuery = (
  bankId: BankId | undefined,
  name: CatalogName | undefined,
  params: ReturnType<typeof catalogParamsOf>,
) =>
  bankId !== undefined && name !== undefined ?
    catalogQuery(bankId, name, params)
  : undefined;

/** Fetcher of the bank catalog, or `skipToken` while it must not be requested. */
const bankCatalogFn = (
  listed: ReturnType<typeof listedCatalogQuery>,
  waitingParent: boolean,
  hasLocal: boolean,
) =>
  listed?.queryFn !== undefined && !waitingParent && !hasLocal ?
    listed.queryFn
  : skipToken;

/** A skipped query must not be refetched: TanStack rejects a `skipToken` fetch. */
const retryOf =
  (refetch: () => Promise<unknown>, canFetch: boolean) => (): void => {
    if (canFetch) void refetch();
  };

const canLoadRequestPeople = (
  fromRequest: boolean,
  requestId: string | undefined,
  hasLocal: boolean,
): boolean => fromRequest && requestId !== undefined && !hasLocal;

interface UseCatalogOptions {
  /** Absent when the legacy request detail has no bank. The field still renders. */
  bankId: BankId | undefined;
  catalog: CatalogRef;
  /** Value of the field the catalog depends on; `undefined` while it is not chosen. */
  parentValue: string | undefined;
  /** Country the catalog is read for (`country_from` catalogs); the bank's own when omitted. */
  country?: CountryCode | undefined;
  /** Keeps only the rows that apply to this kind of person (e.g. identification types). */
  personType?: PersonType;
  /** Current value of the field (a local catalog keeps it listed). */
  selected?: string | undefined;
}

/**
 * Options of a field's catalog. A dependent catalog waits for its parent and
 * is requested with `parent_id`; a request-scoped one (`source: 'request'`)
 * lists the people of the request in scope (`RequestScopeContext`). A failing catalog never breaks
 * the page: the field reports `isUnavailable` and offers `retry`.
 */
const useCatalog = ({
  bankId,
  catalog,
  parentValue,
  country,
  personType,
  selected,
}: UseCatalogOptions) => {
  const locale = useLocale();
  const local = use(LocalCatalogsContext)?.(catalog.name, selected);
  const requestId = use(RequestScopeContext);
  const fromRequest = catalog.source === 'request';
  const name =
    !fromRequest && isCatalogName(catalog.name) ? catalog.name : undefined;
  const waitingParent =
    catalog.parent !== undefined && parentValue === undefined;
  const hasLocal = local !== undefined;
  const listed = listedCatalogQuery(
    bankId,
    name,
    catalogParamsOf(country, parentValue, personType, name),
  );
  const catalogFn = bankCatalogFn(listed, waitingParent, hasLocal);
  const query = useQuery({
    queryKey: listed?.queryKey ?? queryKeys.catalogs.unlisted(catalog.name),
    queryFn: catalogFn,
    select: (page) => ({
      ...page,
      results: presentCatalogItems(page.results, locale),
    }),
    throwOnError: false,
    retry: false,
    staleTime: Infinity,
  });

  const people = useQuery({
    ...relatedPersonsQuery(requestId ?? '', catalog),
    select: asOptions(),
    enabled: canLoadRequestPeople(fromRequest, requestId, hasLocal),
    throwOnError: false,
    retry: false,
  });

  const localOptions = useMemo(
    () =>
      local === undefined ? undefined : presentCatalogItems(local, locale),
    [local, locale],
  );

  if (localOptions !== undefined) {
    return {
      options: localOptions,
      isLoaded: true,
      isLoading: false,
      isWaitingParent: false,
      isUnavailable: false,
      retry: () => undefined,
    };
  }

  if (fromRequest) {
    // The schema checks the chosen people are still listed (broken links).
    if (people.data !== undefined) {
      rememberCatalog(catalog.name, requestFilterOf(catalog), people.data);
    }
    return {
      options: people.data ?? NO_OPTIONS,
      isLoaded: people.data !== undefined,
      isLoading: people.isFetching,
      isWaitingParent: false,
      isUnavailable: requestId === undefined || people.isError,
      retry: () => {
        void people.refetch();
      },
    };
  }

  // The schema checks rows already read (prohibited countries, empty dependent
  // catalogs); remembering them is an idempotent cache write.
  const rows = query.data?.results;
  if (name !== undefined && rows !== undefined && personType === undefined) {
    rememberCatalog(name, parentValue, rows);
  }

  return {
    options: rows ?? NO_OPTIONS,
    isLoaded: rows !== undefined,
    isLoading: query.isFetching,
    isWaitingParent: waitingParent,
    isUnavailable: bankId === undefined || name === undefined || query.isError,
    retry: retryOf(query.refetch, catalogFn !== skipToken),
  };
};

export { useCatalog, type UseCatalogOptions };
