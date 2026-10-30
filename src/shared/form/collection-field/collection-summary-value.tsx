'use client';

import type { FieldDefinition } from '@/contracts/types';
import type { Item } from './types';

import { catalogCountryOf, catalogParentOf } from '@/contracts/catalogs';

import { useCatalog } from '../hooks';
import { useCollectionField } from './context';

interface CollectionSummaryValueProps {
  field: FieldDefinition;
  item: Item;
}

/** One answer of the summary; a catalog code shows its option name (cached catalog query). */
const CollectionSummaryValue = ({
  field,
  item,
}: Readonly<CollectionSummaryValueProps>) => {
  const { bankId, country } = useCollectionField();
  const value = String(item[field.key]);
  const parent = catalogParentOf(field.catalog, country);
  // eslint-disable-next-line security/detect-object-injection -- `parent` is a field key from the registry
  const parentValue = parent === undefined ? undefined : item[parent];
  const { options } = useCatalog({
    bankId,
    // Text fields pass an unknown catalog name, so no request is made.
    catalog: field.catalog ?? { name: '', source: 'unknown' },
    parentValue: typeof parentValue === 'string' ? parentValue : undefined,
    country: catalogCountryOf(field.catalog, item, country),
    selected: value,
  });
  if (field.type !== 'catalog') return value;
  return options.find((option) => option.code === value)?.name ?? value;
};

export { CollectionSummaryValue, type CollectionSummaryValueProps };
