import type {
  OpeningCurrentSection,
  OpeningSectionField,
} from '@/server/api/account-opening-requests';

import {
  answerableOpeningFields,
  canPaintOpeningItems,
  isOpeningFieldVisible,
  requiredOpeningFields,
  toOpeningFieldDefinition,
} from './fields';

/** What the screen has to answer a field with. */
interface OpeningAnswerContext {
  /** Bank the catalogs are read from. */
  bankId: string | undefined;
  /** Request country, the default dial code of phone fields. */
  country: string | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Read path: never throws. Before the first save the API answers `{}`,
 * with no payload: that reads as no answers. A malformed payload reads
 * the same way, so the screen can still open.
 */
const openingAnswerPayload = (
  answer: { payload?: unknown } | undefined,
): Record<string, unknown> => {
  const payload = answer?.payload;
  return isRecord(payload) ? payload : {};
};

/**
 * Write path: refuses to PUT over a payload it cannot merge. A missing
 * payload is an empty answer. Anything else that is not an object would
 * drop every other section.
 */
const savableAnswerPayload = (answer: {
  payload?: unknown;
}): Record<string, unknown> => {
  const { payload } = answer;
  if (payload === undefined || payload === null) return {};
  if (isRecord(payload)) return payload;
  throw new TypeError('Opening step answer payload is not an object');
};

const valueAt = (record: Record<string, unknown>, key: string): unknown =>
  Object.entries(record).find(([code]) => code === key)?.[1];

const isOpeningValueFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    if ('number' in value) {
      return isOpeningValueFilled(Reflect.get(value, 'number'));
    }
    return Object.values(value).some(isOpeningValueFilled);
  }
  return false;
};

/**
 * Whether Continue waits for the field. A field the renderer cannot paint
 * (unmapped type or catalog, phone without a country) never does. A catalog
 * without a bank stays on screen as unavailable and does not either.
 */
const countsTowardOpeningContinue = (
  field: OpeningSectionField,
  { bankId, country }: OpeningAnswerContext,
): boolean => {
  if (field.field_type === 'collection') {
    return (
      bankId !== undefined &&
      country !== undefined &&
      canPaintOpeningItems(field)
    );
  }
  const definition = toOpeningFieldDefinition(field);
  if (
    definition === undefined ||
    (definition.type === 'phone' && country === undefined)
  ) {
    return false;
  }
  return (
    bankId !== undefined ||
    (definition.type !== 'catalog' && definition.type !== 'multi_catalog')
  );
};

/**
 * Codes of the required fields still empty; Continue stops on them. With a
 * `context`, only fields the screen can answer count.
 */
const missingOpeningRequiredFields = (
  section: Pick<OpeningCurrentSection, 'fields' | 'values'> & {
    step_code?: string;
  },
  context?: OpeningAnswerContext,
): string[] =>
  requiredOpeningFields(section)
    .filter(
      (field) =>
        (context === undefined ||
          countsTowardOpeningContinue(field, context)) &&
        !isOpeningValueFilled(section.values[field.code]),
    )
    .map((field) => field.code);

/**
 * Answers of one section. They live under the section code. A copy left at
 * the payload root wins, so a flat save still shows until the next write
 * moves it inside.
 */
const openingSectionValues = (
  payload: Record<string, unknown>,
  sectionCode: string,
  fields: readonly OpeningSectionField[],
): Record<string, unknown> => {
  const nested = valueAt(payload, sectionCode);
  const stored = isRecord(nested) ? nested : {};
  const fromRoot = answerableOpeningFields(fields)
    .filter(
      (field) =>
        field.code !== sectionCode && Object.keys(payload).includes(field.code),
    )
    .map((field) => [field.code, valueAt(payload, field.code)] as const);
  return { ...stored, ...Object.fromEntries(fromRoot) };
};

/**
 * Step payload with one section's answers written under its section code.
 * The `PUT` replaces the whole payload, so the other sections stay. Root
 * copies of this section's fields are removed, and fields the section hides
 * are dropped.
 */
const mergeOpeningSectionValues = (
  payload: Record<string, unknown>,
  sectionCode: string,
  fields: readonly OpeningSectionField[],
  values: Record<string, unknown>,
): Record<string, unknown> => {
  const sectionFields = answerableOpeningFields(fields);
  const codes = new Set(sectionFields.map((field) => field.code));
  const nested = valueAt(payload, sectionCode);
  const kept = Object.entries(isRecord(nested) ? nested : {}).filter(
    ([code]) => !codes.has(code),
  );
  const answered = sectionFields
    .filter(
      (field) =>
        isOpeningFieldVisible(field, values) &&
        values[field.code] !== undefined,
    )
    .map((field) => [field.code, values[field.code]] as const);
  const rest = Object.entries(payload).filter(
    ([code]) => code !== sectionCode && !codes.has(code),
  );
  return Object.fromEntries([
    ...rest,
    [sectionCode, Object.fromEntries([...kept, ...answered])],
  ]);
};

export {
  countsTowardOpeningContinue,
  isOpeningValueFilled,
  mergeOpeningSectionValues,
  missingOpeningRequiredFields,
  openingAnswerPayload,
  openingSectionValues,
  savableAnswerPayload,
  type OpeningAnswerContext,
};
