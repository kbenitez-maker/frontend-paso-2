'use client';

import type { ContractStep } from '@/contracts';
import type { CatalogRef } from '@/contracts/types';

import { useQueries } from '@tanstack/react-query';

import { stepFields } from '@/contracts';
import { rememberCatalog, requestFilterOf } from '@/contracts/catalogs';
import { relatedPersonsQuery } from '@/server/api';

/** One request-scoped catalog per filter among the step's fields. */
const requestCatalogsOf = (step: ContractStep): CatalogRef[] => [
  ...new Map(
    stepFields(step).flatMap(({ field: { catalog } }) =>
      catalog?.source === 'request' ?
        [[requestFilterOf(catalog), catalog] as const]
      : [],
    ),
  ).values(),
];

/**
 * Reads the people every request-scoped catalog of the step lists before its
 * form starts, so the schema flags from the first render the designations
 * whose person is gone (POC broken links), list items included. A list that
 * fails to load flags nothing and does not hold the form back.
 */
const useRequestCatalogs = (requestId: string, step: ContractStep): boolean => {
  const catalogs = requestCatalogsOf(step);
  const results = useQueries({
    queries: catalogs.map((catalog) => ({
      ...relatedPersonsQuery(requestId, catalog),
      throwOnError: false,
      retry: false,
    })),
  });

  catalogs.forEach((catalog, index) => {
    const people = results.at(index)?.data?.results;
    if (people !== undefined) {
      rememberCatalog(
        catalog.name,
        requestFilterOf(catalog),
        people.map((person) => ({ code: person.id })),
      );
    }
  });
  return results.every((result) => !result.isPending);
};

export { useRequestCatalogs };
