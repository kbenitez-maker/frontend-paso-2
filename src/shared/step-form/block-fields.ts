import type { ContractStep, SectionField, SectionKey } from '@/contracts';
import type { FieldDefinition } from '@/contracts/types';
import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { CountryCode } from '@/types/domain';

import { stepFields } from '@/contracts';
import { catalogDependentsOf } from '@/contracts/catalogs';

/** A registry field with the API section its value is saved into. */
type BlockField = SectionField;

/** What a block renders: a plain field, or the items of an embedded collection. */
type BlockItem =
  | { kind: 'field'; field: FieldDefinition }
  | { kind: 'collection'; name: string; fields: FieldDefinition[] };

/** Fields a block asks for in a country, in registry order (the sheet order). */
const blockFieldsOf = (
  step: ContractStep,
  block: BlockOf<StepSlug>,
  country: CountryCode,
): BlockField[] =>
  stepFields(step).filter(
    ({ field }) =>
      field.block === block &&
      field.ui_only !== true &&
      field.countries.includes(country),
  );

/** Key the form (and the DTO) holds a field's value under: the top collection for item fields. */
const valueKey = (field: FieldDefinition): string =>
  field.parent_collection ?? field.collection ?? field.key;

/**
 * Plain fields and collections, each collection at the place of its first
 * field. A collection carries its child collections' fields too: they are
 * edited inside its items.
 */
const blockItems = (fields: readonly BlockField[]): BlockItem[] => {
  const items: BlockItem[] = [];
  for (const { field } of fields) {
    if (field.collection === undefined) {
      items.push({ kind: 'field', field });
      continue;
    }
    const name = valueKey(field);
    const existing = items.find(
      (item) => item.kind === 'collection' && item.name === name,
    );
    if (existing?.kind === 'collection') existing.fields.push(field);
    else items.push({ kind: 'collection', name, fields: [field] });
  }
  return items;
};

/** Keys of the fields whose catalog is filtered, directly or through others, by `key`. */
const dependentsOf = (
  fields: readonly BlockField[],
  key: string,
  country: CountryCode,
): string[] =>
  catalogDependentsOf(
    fields.map((entry) => entry.field),
    key,
    country,
  );

/** Sections the block saves into, in registry order. */
const sectionsOf = (fields: readonly BlockField[]): SectionKey[] => [
  ...new Set(fields.map((entry) => entry.section)),
];

/** Form keys the block owns inside one section. */
const keysOfSection = (
  fields: readonly BlockField[],
  section: SectionKey,
): string[] => [
  ...new Set(
    fields
      .filter((entry) => entry.section === section)
      .map((entry) => valueKey(entry.field)),
  ),
];

export {
  blockFieldsOf,
  blockItems,
  dependentsOf,
  keysOfSection,
  sectionsOf,
  valueKey,
  type BlockField,
  type BlockItem,
};
