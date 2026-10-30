import type { FieldDefinition } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type { Resolver } from 'react-hook-form';
import type { FormValues } from '../../lib';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  buildSectionSchema,
  isRecord,
  issueCode,
  visibleValues,
} from '@/contracts';

type Item = Record<string, unknown>;

/** The draft item of a collection's own form (it lives at `<name>.0`). */
const itemOf = (values: FormValues, name: string): Item => {
  // eslint-disable-next-line security/detect-object-injection -- `name` is a registry collection key
  const rows = values[name];
  const [first] = Array.isArray(rows) ? rows : [];
  return isRecord(first) ? first : {};
};

/**
 * Validates one item with the collection's schema (required when visible,
 * formats, child collection limits) to point at what is missing; it never
 * blocks saving. The item is checked in its place among the saved `items`,
 * so a rule across items (a cycle in the shareholders) sees the list; only
 * the item's own errors are kept. The collection's own `min_items` counts the
 * list, not the item, so it is left out here.
 */
const itemResolver =
  (
    name: string,
    fields: readonly FieldDefinition[],
    scope: Item,
    country: CountryCode,
    items: readonly Item[],
    index: number,
  ): Resolver<FormValues> =>
  async (values, context, options) => {
    const draft = visibleValues(
      fields,
      name,
      itemOf(values, name),
      scope,
      country,
    );
    const list = [...items];
    list.splice(index, 1, draft);
    const result = await zodResolver(
      buildSectionSchema(
        fields.map((field): FieldDefinition => {
          if (field.collection !== name) return field;
          const { min_items: _min, ...rest } = field;
          return rest;
        }),
        country,
        scope,
      ),
      {
        error: (issue) => issueCode(issue),
      },
    )({ [name]: list }, context, options);
    // eslint-disable-next-line security/detect-object-injection -- `name` is a registry collection key
    const own: unknown = result.errors[name];
    // An array, or an object when a list-level rule (e.g. `sole_item_not`) also failed.
    const mine: unknown =
      typeof own === 'object' && own !== null ?
        Object.entries(own).find(([key]) => key === String(index))?.[1]
      : undefined;
    return mine === undefined ?
        { values: { [name]: [draft] }, errors: {} }
      : { values: {}, errors: { [name]: [mine] } };
  };

export { itemOf, itemResolver };
