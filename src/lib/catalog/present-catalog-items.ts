import type { CatalogItem } from '@/server/api';

import { normalizeCatalogDisplayName } from './normalize-catalog-display-name';

/** Applies display normalization to catalog rows without changing codes or flags. */
const presentCatalogItem = (
  item: CatalogItem,
  locale: string,
): CatalogItem => ({
  ...item,
  name: normalizeCatalogDisplayName(item.name, locale),
});

const presentCatalogItems = (
  items: readonly CatalogItem[],
  locale: string,
): CatalogItem[] => items.map((item) => presentCatalogItem(item, locale));

export { presentCatalogItem, presentCatalogItems };
