'use client';

import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { OpeningSectionField } from '@/server/api';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';

import { canPaintOpeningItems, openingCollectionFields } from '@/lib/opening';
import { CollectionField } from '@/shared/form/collection-field';

interface OpeningCollectionProps {
  field: OpeningSectionField;
  block: BlockOf<StepSlug>;
  bankId: BankId | undefined;
  country: CountryCode | undefined;
  icons?: ReadonlyMap<string, ReactNode> | undefined;
}

/** One opening-request collection: items are added in a dialog and each item's fields follow its own answers. */
const OpeningCollection = ({
  field,
  block,
  bankId,
  country,
  icons,
}: Readonly<OpeningCollectionProps>) => {
  if (bankId === undefined || country === undefined) return null;
  if (!canPaintOpeningItems(field)) return null;
  const fields = openingCollectionFields(field, block);
  if (fields.length === 0) return null;
  const labelOf = (key: string) =>
    field.children?.find((child) => child.code === key)?.display_name ?? '';

  return (
    <CollectionField
      name={field.code}
      fields={fields}
      country={country}
      bankId={bankId}
      labelOf={labelOf}
      icons={icons}
    />
  );
};

export { OpeningCollection };
