'use client';

import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';
import type { BlockField, BlockItem } from '../block-fields';
import type { Values } from '../block-values';

import { useWatch } from 'react-hook-form';

import {
  isCollectionShown,
  isRequired,
  isVisible,
  ownFieldsOf,
} from '@/contracts';
import { CollectionField } from '@/shared/form/collection-field';
import { FormField, iconOf } from '@/shared/form/form-field';
import { SectionCard } from '@/shared/request/section-card';

import { dependentsOf } from '../block-fields';

interface BlockCardProps {
  title: string;
  items: readonly BlockItem[];
  /** Every field of the block, to know which catalogs hang from which. */
  fields: readonly BlockField[];
  /** Saved values the block does not own, for conditions that read other blocks. */
  context: Values;
  country: CountryCode;
  bankId: BankId;
  /** Label of a field of the step by key (and country variant). */
  labelOf: (key: string, variant?: string) => string;
  /** Leading icons of text inputs by field key. */
  icons?: ReadonlyMap<string, ReactNode> | undefined;
  /** Rendered after the fields, inside the card (custom blocks add notices here). */
  children?: ReactNode;
}

/**
 * Keeps the items that are visible under `values`. A collection stays while
 * some field is visible in some item (or in a new empty item); its fields are
 * filtered per item by `CollectionField`.
 */
const visibleItems = (
  items: readonly BlockItem[],
  values: Values,
  country: CountryCode,
): BlockItem[] =>
  items.filter((item) => {
    if (item.kind === 'field') {
      return isVisible(item.field.visible_when, values, country);
    }
    const saved = values[item.name];
    return isCollectionShown(
      ownFieldsOf(item.fields, item.name),
      Array.isArray(saved) ? saved : [],
      values,
      country,
    );
  });

/** Default card of a block: the items that are visible under the current answers. */
const BlockCard = ({
  title,
  items,
  fields,
  context,
  country,
  bankId,
  labelOf,
  icons,
  children,
}: Readonly<BlockCardProps>) => {
  const values: Values = { ...context, ...useWatch() };
  const visible = visibleItems(items, values, country);
  const required = visible.some((item) =>
    (item.kind === 'field' ? [item.field] : item.fields).some((field) =>
      isRequired(field.required, country),
    ),
  );

  return (
    <SectionCard title={title} required={required}>
      {visible.map((item) =>
        item.kind === 'field' ?
          <FormField
            key={item.field.key}
            field={item.field}
            name={item.field.key}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            icon={iconOf(item.field, icons)}
            dependents={dependentsOf(fields, item.field.key, country)}
          />
        : <CollectionField
            key={item.name}
            name={item.name}
            fields={item.fields}
            scope={values}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            icons={icons}
          />,
      )}
      {children}
    </SectionCard>
  );
};

export { BlockCard, visibleItems, type BlockCardProps };
