'use client';

import { Fragment } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { Item } from './types';

import { useTranslations } from 'next-intl';

import { CollectionSummaryValue } from './collection-summary-value';
import { summaryFieldsOf } from './lib/summary-fields';

interface CollectionSummaryProps {
  /** Fields of the item that are visible. */
  fields: readonly FieldDefinition[];
  item: Item;
}

/** Up to two answers that tell the item apart, else "unfilled". */
const CollectionSummary = ({
  fields,
  item,
}: Readonly<CollectionSummaryProps>) => {
  const t = useTranslations('Form.collection');
  const summary = summaryFieldsOf(fields, item);
  if (summary.length === 0) return t('unfilled');

  return summary.map((field, part) => (
    <Fragment key={field.key}>
      {part > 0 ? ' · ' : null}
      <CollectionSummaryValue field={field} item={item} />
    </Fragment>
  ));
};

export { CollectionSummary, type CollectionSummaryProps };
