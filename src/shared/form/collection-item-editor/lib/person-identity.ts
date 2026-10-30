import type { FieldDefinition } from '@/contracts/types';

import {
  isEmptyValue,
  isRecord,
  ownFieldsOf,
  SECTION_KEYS,
  sectionFields,
} from '@/contracts';

type Item = Record<string, unknown>;

/** A person already registered in another collection (POC `reconocer`). */
interface KnownPerson {
  /** Collection the person was found in. */
  collection: string;
  /** Answered title fields of that record, joined (empty when none). */
  name: string;
  /** Values of this collection's fields that the record already holds, by field key. */
  inherited: Item;
}

const REGISTRY: readonly FieldDefinition[] = SECTION_KEYS.flatMap((section) =>
  sectionFields(section),
);

const datumOf = (field: FieldDefinition): string =>
  field.person_field ?? field.key;

/** Identity of an item: its identity data, normalized; `undefined` while a part is missing or none is declared. */
const identityOf = (
  members: readonly FieldDefinition[],
  item: Item,
): string | undefined => {
  const parts = members
    .filter((field) => field.identity === true)
    .map((field) => {
      const value = item[field.key];
      return {
        datum: datumOf(field),
        value: typeof value === 'string' ? value.trim().toLowerCase() : '',
      };
    });
  if (parts.length === 0 || parts.some(({ value }) => value === '')) {
    return undefined;
  }
  return parts
    .map(({ datum, value }) => `${datum}=${value}`)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
};

/** Index of another item of the same collection with the draft's identity (POC `duplicadoDe`). */
const duplicateOf = (
  members: readonly FieldDefinition[],
  draft: Item,
  items: readonly Item[],
  self: number,
): number | undefined => {
  const identity = identityOf(members, draft);
  if (identity === undefined) return undefined;
  const index = items.findIndex(
    (item, position) =>
      position !== self && identityOf(members, item) === identity,
  );
  return index === -1 ? undefined : index;
};

/**
 * The draft's person when another collection in `scope` already holds them
 * (matched by identity data). Only what that record answered is inherited:
 * what it left empty is still asked here.
 */
const knownPersonOf = (
  name: string,
  members: readonly FieldDefinition[],
  draft: Item,
  scope: Item,
  registry: readonly FieldDefinition[] = REGISTRY,
): KnownPerson | undefined => {
  const identity = identityOf(members, draft);
  if (identity === undefined) return undefined;
  for (const [collection, records] of Object.entries(scope)) {
    if (collection === name || !Array.isArray(records)) continue;
    const theirs = ownFieldsOf(registry, collection);
    const record = records.find(
      (candidate: unknown): candidate is Item =>
        isRecord(candidate) && identityOf(theirs, candidate) === identity,
    );
    if (record === undefined) continue;
    const inherited = Object.fromEntries(
      // The identification itself stays editable: it is what is being matched.
      members.flatMap((field) => {
        if (field.identity === true) return [];
        const source = theirs.find(
          (their) => datumOf(their) === datumOf(field),
        );
        const value = source === undefined ? undefined : record[source.key];
        return isEmptyValue(value) ? [] : [[field.key, value]];
      }),
    );
    if (Object.keys(inherited).length === 0) continue;
    const title = theirs
      .flatMap((field) => {
        const value = record[field.key];
        return field.item_title && typeof value === 'string' ? [value] : [];
      })
      .join(' ')
      .trim();
    return { collection, name: title, inherited };
  }
  return undefined;
};

export { duplicateOf, identityOf, knownPersonOf, type KnownPerson };
