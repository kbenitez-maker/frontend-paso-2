import type { SectionKey } from '@/contracts';
import type { CountryCode } from '@/types/domain';
import type { Resolver } from 'react-hook-form';
import type { BlockField } from './block-fields';
import type { Values } from './block-values';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  buildSectionSchema,
  isMissingCode,
  isRecord,
  issueCode,
  sectionFields,
} from '@/contracts';

import { normalizeValues } from './block-values';

/**
 * A rule the registry cannot express (e.g. roles a matrix requires), given the
 * block's own values: an error code per form key it breaks.
 */
type BlockRule = (values: Values) => readonly { path: string; code: string }[];

/**
 * Resolver of one block: the generated schema of just the block's fields,
 * fed with the values the block really holds (blanks and hidden answers
 * removed), plus the step's own `rule`. Errors carry the shared issue codes,
 * which the form turns into copy.
 */
const blockResolver =
  (
    fields: readonly BlockField[],
    context: Values,
    country: CountryCode,
    rule?: BlockRule,
  ): Resolver<Values> =>
  async (values, formContext, options) => {
    const schema = buildSectionSchema(
      fields.map((entry) => entry.field),
      country,
      context,
    );
    const normalized = normalizeValues(fields, values, context, country);
    const result = await zodResolver(schema, {
      error: (issue) => issueCode(issue),
    })(normalized, formContext, options);
    const broken = rule?.(normalized) ?? [];
    if (broken.length === 0) return result;

    return {
      values: {},
      errors: {
        ...result.errors,
        ...Object.fromEntries(
          broken.map(({ path, code }) => [
            path,
            { type: 'rule', message: code },
          ]),
        ),
      },
    };
  };

/**
 * Removes the value at `path`: a key, `[collection, index, key]`, or deeper
 * through child collections. A path that stops at an item drops the item.
 */
const omitPath = (values: Values, path: readonly PropertyKey[]): Values => {
  const [head, index, ...rest] = path;
  if (typeof head !== 'string') return values;
  // eslint-disable-next-line security/detect-object-injection -- `head` is a key of the values being saved
  const current = values[head];

  if (!Array.isArray(current) || typeof index !== 'number') {
    return Object.fromEntries(
      Object.entries(values).filter(([name]) => name !== head),
    );
  }
  return {
    ...values,
    [head]:
      rest.length === 0 ?
        current.filter((_item: unknown, position) => position !== index)
      : current.map((item: unknown, position) =>
          position === index && isRecord(item) ? omitPath(item, rest) : item,
        ),
  };
};

/**
 * Values safe to autosave: whatever fails type or format validation is left
 * out (the server would reject the whole section), while missing answers
 * (required fields, collection minimums) are fine in a draft.
 */
const draftValues = (
  fields: readonly BlockField[],
  values: Values,
  context: Values,
  country: CountryCode,
): Values => {
  const schema = buildSectionSchema(
    fields.map((entry) => entry.field),
    country,
    context,
  );
  const result = schema.safeParse(values);
  if (result.success) return values;

  return result.error.issues
    .filter((issue) => !isMissingCode(issueCode(issue)))
    .reduce((kept, issue) => omitPath(kept, issue.path), values);
};

/** Whether a whole section (every block of it) already satisfies its complete schema. */
const isSectionComplete = (
  section: SectionKey,
  country: CountryCode,
  body: Values,
  context: Values,
): boolean =>
  buildSectionSchema(sectionFields(section), country, context).safeParse(body)
    .success;

export { blockResolver, draftValues, isSectionComplete, type BlockRule };
