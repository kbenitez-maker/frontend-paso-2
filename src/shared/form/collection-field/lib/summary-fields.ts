import type { FieldDefinition } from '@/contracts/types';
import type { Item } from '../types';

const SUMMARY_TYPES = new Set<FieldDefinition['type']>([
  'string',
  'email',
  'catalog',
]);

/** Up to two distinct answered text or catalog fields of the item, in registry order, to tell items apart. */
const summaryFieldsOf = (
  fields: readonly FieldDefinition[],
  item: Item,
): FieldDefinition[] =>
  fields
    .filter((field) => {
      const value = item[field.key];
      return (
        SUMMARY_TYPES.has(field.type) &&
        typeof value === 'string' &&
        value.trim() !== ''
      );
    })
    // POC: a value copied to several fields shows once.
    .filter(
      (field, index, all) =>
        all.findIndex((other) => item[other.key] === item[field.key]) === index,
    )
    .slice(0, 2);

export { summaryFieldsOf };
