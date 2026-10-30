'use client';

import type { CatalogItem } from '@/server/api';
import type { BankId, CatalogName } from '@/types/domain';

import { useQueries } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { presentCatalogItems } from '@/lib/catalog';
import { catalogQuery } from '@/server/api';

/** Code-to-name lookup over some catalogs of the bank (the code until they load). */
const useCatalogNames = (bankId: BankId, names: readonly CatalogName[]) => {
  const locale = useLocale();

  return useQueries({
    queries: names.map((name) => ({
      ...catalogQuery(bankId, name),
      select: (page: { results: readonly CatalogItem[] }) =>
        presentCatalogItems(page.results, locale),
      throwOnError: false,
      staleTime: Infinity,
    })),
    combine: (results) => {
      const rows = results.flatMap((result) => result.data ?? []);
      return (code: string) =>
        rows.find((row) => row.code === code)?.name ?? code;
    },
  });
};

export { useCatalogNames };
