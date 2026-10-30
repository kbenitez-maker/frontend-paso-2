'use client';

import { createContext } from 'react';

import type { CatalogItem } from '@/server/api';

/**
 * Options a screen builds from its own answers for a catalog name (the
 * companies of the shareholders tree), given the field's current value (an
 * option it hides stays listed while chosen); `undefined` reads the bank catalog.
 */
type LocalCatalogs = (
  name: string,
  selected: string | undefined,
) => readonly CatalogItem[] | undefined;

const LocalCatalogsContext = createContext<LocalCatalogs | undefined>(
  undefined,
);

export { LocalCatalogsContext, type LocalCatalogs };
