import type { FieldDefinition } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';

import { collectionsIn, ownFieldsOf } from '@/contracts';

/** What the item editor lays out: a field of the item, or a child collection by key. */
type Entry = FieldDefinition | string;

/** The item's fields and child collections in sheet order, each child at the place of its first field. */
const entriesOf = (
  fields: readonly FieldDefinition[],
  name: string,
): Entry[] => {
  const children = collectionsIn(fields, name);
  return fields.flatMap((field, index): Entry[] => {
    if (field.collection === name) return [field];
    const child = children.find((key) => key === field.collection);
    return (
        child !== undefined &&
          fields.findIndex((other) => other.collection === child) === index
      ) ?
        [child]
      : [];
  });
};

/** Fields of an entry: the field itself, or the fields of a child collection. */
const membersOf = (fields: readonly FieldDefinition[], entry: Entry) =>
  typeof entry === 'string' ? ownFieldsOf(fields, entry) : [entry];

const tabOf = (fields: readonly FieldDefinition[], entry: Entry) =>
  membersOf(fields, entry)[0]?.item_tab;

const groupOf = (fields: readonly FieldDefinition[], entry: Entry) =>
  membersOf(fields, entry)[0]?.item_group;

/** Form path of an entry inside the draft (`<name>.0.<key>`). */
const pathOf = (name: string, entry: Entry) =>
  `${name}.0.${typeof entry === 'string' ? entry : entry.key}`;

/**
 * Item tabs from what applies to the country (POC: not from what is visible,
 * so the tab row does not shift while answering), in the order of their labels
 * (POC order), then registry order.
 */
const tabsOf = (
  fields: readonly FieldDefinition[],
  entries: readonly Entry[],
  country: CountryCode,
  order: readonly string[],
): string[] => {
  const rank = (tab: string) => {
    const index = order.indexOf(tab);
    return index === -1 ? order.length : index;
  };
  return [
    ...new Set(
      entries.flatMap((entry) =>
        membersOf(fields, entry).flatMap((field) =>
          field.item_tab !== undefined && field.countries.includes(country) ?
            [field.item_tab]
          : [],
        ),
      ),
    ),
  ].sort((a, b) => rank(a) - rank(b));
};

export { entriesOf, groupOf, pathOf, tabOf, tabsOf, type Entry };
