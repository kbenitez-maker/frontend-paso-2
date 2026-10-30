import type { SectionKey } from '@/contracts';
import type { CountryCode } from '@/types/domain';
import type { BlockField } from './block-fields';

import { visibleValues } from '@/contracts';

import { keysOfSection, valueKey } from './block-fields';

type Values = Record<string, unknown>;

/** Values saved per section, as the API returns them. */
type SectionValues = Partial<Record<SectionKey, Values>>;

/** Every saved value of the step's sections, for cross-section conditions. */
const mergeSections = (bySection: SectionValues): Values =>
  Object.fromEntries(
    Object.values(bySection).flatMap((values) => Object.entries(values)),
  );

/** Saved values of everything the block does not own; the block's own keys come from the form. */
const contextOf = (
  bySection: SectionValues,
  fields: readonly BlockField[],
): Values => {
  const owned = new Set(fields.map((entry) => valueKey(entry.field)));
  return Object.fromEntries(
    Object.entries(mergeSections(bySection)).filter(([key]) => !owned.has(key)),
  );
};

/** Form values the block starts with: what is saved for its own fields. */
const initialValues = (
  fields: readonly BlockField[],
  bySection: SectionValues,
): Values => {
  const values: Values = {};
  for (const { section, field } of fields) {
    const key = valueKey(field);
    // eslint-disable-next-line security/detect-object-injection -- `section` is a registry key
    const saved = bySection[section]?.[key];
    // eslint-disable-next-line security/detect-object-injection -- `head` is a key of the values being edited
    if (saved !== undefined) values[key] = saved;
  }
  return values;
};

/**
 * What the block really holds: blanks removed and hidden answers dropped,
 * collection items (and their child collections) pruned one by one, so their
 * fields may depend on sibling fields and on the parent item.
 */
const normalizeValues = (
  fields: readonly BlockField[],
  values: Values,
  context: Values,
  country: CountryCode,
): Values =>
  visibleValues(
    fields.map((entry) => entry.field),
    undefined,
    values,
    context,
    country,
  );

/** Body of one section: what is saved there, minus the block's keys, plus the block's values. */
const sectionBody = (
  section: SectionKey,
  fields: readonly BlockField[],
  bySection: SectionValues,
  normalized: Values,
): Values => {
  const owned = keysOfSection(fields, section);
  // eslint-disable-next-line security/detect-object-injection -- `section` is a registry key
  const saved = bySection[section] ?? {};
  return {
    ...Object.fromEntries(
      Object.entries(saved).filter(([key]) => !owned.includes(key)),
    ),
    ...Object.fromEntries(
      Object.entries(normalized).filter(([key]) => owned.includes(key)),
    ),
  };
};

export {
  contextOf,
  initialValues,
  mergeSections,
  normalizeValues,
  sectionBody,
  type SectionValues,
  type Values,
};
