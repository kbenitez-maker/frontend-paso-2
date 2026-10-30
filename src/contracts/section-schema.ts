import type { CountryCode } from '@/types/domain';
import type { FieldDefinition, PhoneValue, Rule } from './types';
import type { Values } from './visibility';

import { z } from 'zod';

import { closesCycle, itemsIn } from '@/lib/ownership';

import { isProhibitedCountry, isUnlisted } from './catalogs';
import {
  collectionsIn,
  isItemVisible,
  isRecord,
  itemsOf,
  ownFieldsOf,
  requiredFieldsIssues,
} from './visibility';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Today, `years` years ago, as an ISO date. */
const yearsAgoIso = (years: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
};

/** International dial code (`+505`, `+1`). */
const DIAL_CODE = /^\+\d{1,4}$/;
/** National number: digits only, the length range of the Onyx country patterns. */
const PHONE_DIGITS = /^\d{7,14}$/;

const isPhoneValue = (value: unknown): value is PhoneValue =>
  isRecord(value) &&
  typeof value['dial_code'] === 'string' &&
  DIAL_CODE.test(value['dial_code']) &&
  typeof value['number'] === 'string' &&
  PHONE_DIGITS.test(value['number']);

const baseSchema = (field: FieldDefinition): z.ZodType => {
  switch (field.type) {
    case 'string':
      return field.max_length === undefined ?
          z.string()
        : z.string().max(field.max_length);
    case 'integer':
      return z.number().int();
    case 'decimal':
      return z.number();
    case 'date':
      return z.iso.date();
    case 'boolean':
      return z.boolean();
    case 'email':
      return z.email();
    case 'url':
      return z.url();
    case 'phone':
      return z.custom<PhoneValue>(isPhoneValue, { message: 'phone' });
    case 'catalog':
      return z.string().min(1);
    case 'multi_catalog':
      return z.array(z.string().min(1));
    default:
      return field.type satisfies never;
  }
};

const applyRule = (schema: z.ZodType, rule: Rule): z.ZodType => {
  if ('min' in rule) {
    return schema.refine(
      (value) => typeof value !== 'number' || value >= rule.min,
      { message: 'min' },
    );
  }
  if ('max' in rule) {
    return schema.refine(
      (value) => typeof value !== 'number' || value <= rule.max,
      { message: 'max' },
    );
  }
  if ('not_future' in rule) {
    return schema.refine(
      (value) => typeof value !== 'string' || value <= todayIso(),
      { message: 'not_future' },
    );
  }
  if ('max_years_ago' in rule) {
    return schema.refine(
      (value) =>
        typeof value !== 'string' || value >= yearsAgoIso(rule.max_years_ago),
      { message: 'max_years_ago' },
    );
  }
  if ('not_prohibited' in rule) {
    return schema.refine((value) => !isProhibitedCountry(value), {
      message: 'prohibited_country',
    });
  }
  if ('regex' in rule) {
    // eslint-disable-next-line security/detect-non-literal-regexp -- patterns come from the generated registry, never from user input
    const pattern = new RegExp(rule.regex);
    return schema.refine(
      (value) => typeof value !== 'string' || pattern.test(value),
      { message: rule.message_key },
    );
  }
  if ('not_regex' in rule) {
    // eslint-disable-next-line security/detect-non-literal-regexp -- patterns come from the generated registry, never from user input
    const pattern = new RegExp(rule.not_regex, rule.flags);
    return schema.refine(
      (value) => typeof value !== 'string' || !pattern.test(value),
      { message: rule.message_key },
    );
  }
  if ('accepted' in rule) {
    return schema.refine((value) => value !== false, {
      message: rule.message_key,
    });
  }
  if ('url' in rule) {
    return schema.refine(
      (value) => typeof value !== 'string' || z.url().safeParse(value).success,
      { message: 'url' },
    );
  }
  if ('email' in rule) {
    return schema.refine(
      (value) =>
        typeof value !== 'string' || z.email().safeParse(value).success,
      { message: 'email' },
    );
  }
  // Cross-field rules run in the section `superRefine`; `any_true` with the required fields.
  if (
    'gte_field' in rule ||
    'lte_field' in rule ||
    'sum_lte' in rule ||
    'any_true' in rule ||
    'no_ownership_cycle' in rule
  ) {
    return schema;
  }
  return rule satisfies never;
};

/** A person picked from the request's own people must still be listed there (POC broken links). */
const listedSchema = (field: FieldDefinition): z.ZodType => {
  const { catalog } = field;
  const schema = baseSchema(field);
  return catalog?.source === 'request' ?
      schema.refine((value) => !isUnlisted(catalog, value), {
        message: catalog.unlisted_key ?? 'person_unlisted',
      })
    : schema;
};

const fieldSchema = (field: FieldDefinition): z.ZodType =>
  (field.validation ?? [])
    .reduce((schema, rule) => applyRule(schema, rule), listedSchema(field))
    .optional();

const isComparable = (value: unknown): value is string | number =>
  typeof value === 'string' || typeof value === 'number';

const sumOf = (keys: readonly string[], scope: Values): number | undefined => {
  const numbers = keys
    .map((key) => scope[key])
    .filter((value): value is number => typeof value === 'number');
  return numbers.length === 0 ?
      undefined
    : numbers.reduce((total, value) => total + value, 0);
};

/** Code of the comparison rule (`gte_field` / `lte_field`) the current value breaks, if any. */
const brokenComparison = (
  rule: Extract<Rule, { gte_field: string } | { lte_field: string }>,
  current: unknown,
  scope: Values,
): string | undefined => {
  const isGte = 'gte_field' in rule;
  const other = isGte ? scope[rule.gte_field] : scope[rule.lte_field];
  if (!isComparable(current) || !isComparable(other)) return undefined;
  const failed = isGte ? current < other : current > other;
  if (!failed) return undefined;
  return rule.message_key ?? (isGte ? 'gte_field' : 'lte_field');
};

/** Code of the `sum_lte` rule the current value breaks, if any. */
const brokenSum = (
  rule: Extract<Rule, { sum_lte: unknown }>,
  current: unknown,
  scope: Values,
): string | undefined => {
  const { sum, limit, factor = 1 } = rule.sum_lte;
  const total = sumOf(sum, scope);
  const bound = sumOf(limit, scope);
  if (typeof current !== 'number' || total === undefined) return undefined;
  if (bound === undefined || total * factor <= bound) return undefined;
  return rule.message_key;
};

/** Code of the rule the value at `key` breaks against the other fields in `scope`, if any. */
const brokenRule = (
  rule: Rule,
  key: string,
  scope: Values,
): string | undefined => {
  const current = scope[key];
  if ('gte_field' in rule || 'lte_field' in rule) {
    return brokenComparison(rule, current, scope);
  }
  if ('sum_lte' in rule) return brokenSum(rule, current, scope);
  if ('no_ownership_cycle' in rule) {
    return closesCycle(itemsIn(scope['shareholders']), current, scope) ?
        rule.message_key
      : undefined;
  }
  return undefined;
};

/**
 * Cross-field rule gaps of one level (the section, or an item of `owner`),
 * then of its items. `scope` holds the level's values over the outer ones
 * (parent item, section, other sections), so a rule may compare a sibling
 * field or a field of an outer level.
 */
const crossFieldIssues = (
  fields: readonly FieldDefinition[],
  values: Values,
  scope: Values,
  country: CountryCode,
  owner?: string,
  path: readonly (string | number)[] = [],
) => {
  const issues: { path: (string | number)[]; message: string }[] = [];
  for (const field of ownFieldsOf(fields, owner)) {
    if (!field.countries.includes(country)) continue;
    for (const rule of field.validation ?? []) {
      const code = brokenRule(rule, field.key, scope);
      if (code !== undefined) {
        issues.push({ path: [...path, field.key], message: code });
      }
    }
  }
  for (const name of collectionsIn(fields, owner)) {
    const items = itemsOf(values, name);
    const sole = ownFieldsOf(fields, name)[0]?.sole_item_not;
    if (sole !== undefined) {
      const matching = items.filter(
        (item) =>
          isRecord(item) && isItemVisible(sole.item, scope, item, country),
      );
      const [only] = matching;
      if (
        matching.length === 1 &&
        isRecord(only) &&
        isItemVisible(sole.not, scope, only, country)
      ) {
        issues.push({ path: [...path, name], message: sole.message_key });
      }
    }
    items.forEach((item: unknown, index) => {
      if (isRecord(item)) {
        issues.push(
          ...crossFieldIssues(
            fields,
            item,
            { ...scope, ...item },
            country,
            name,
            [...path, name, index],
          ),
        );
      }
    });
  }
  return issues;
};

/** Shape of one level (the section, or an item of `owner`): its fields plus one array per collection it holds. */
const levelShape = (
  fields: readonly FieldDefinition[],
  owner?: string,
): Record<string, z.ZodType> => {
  const shape: Record<string, z.ZodType> = {};
  for (const field of ownFieldsOf(fields, owner)) {
    shape[field.key] = fieldSchema(field);
  }
  for (const name of collectionsIn(fields, owner)) {
    const max = ownFieldsOf(fields, name)[0]?.max_items ?? Infinity;

    shape[name] = z
      .array(z.object(levelShape(fields, name)))
      .refine((items) => items.length <= max, { message: 'max_items' })
      .optional();
  }
  return shape;
};

/**
 * Builds the Zod schema of a section for one country: only applicable fields,
 * base validations, and conditional-required via the shared visibility
 * evaluator, nested per collection item. `context` carries values of other sections referenced by
 * visibility conditions.
 */
const buildSectionSchema = (
  fields: readonly FieldDefinition[],
  country: CountryCode,
  context: Values = {},
) => {
  const applicable = fields.filter(
    (field) => field.ui_only !== true && field.countries.includes(country),
  );
  return z.object(levelShape(applicable)).superRefine((values, ctx) => {
    if (!isRecord(values)) return;
    // Outer paths first: a list-level issue nested after its items' would replace them.
    for (const issue of [
      ...requiredFieldsIssues(applicable, values, country, context),
      ...crossFieldIssues(
        applicable,
        values,
        { ...context, ...values },
        country,
      ),
    ].sort((a, b) => a.path.length - b.path.length)) {
      ctx.addIssue({
        code: 'custom',
        path: issue.path,
        message: issue.message,
      });
    }
  });
};

/** Positions of the items of a top collection with a missing or invalid answer. */
const itemsWithIssues = (
  fields: readonly FieldDefinition[],
  collection: string,
  values: Values,
  country: CountryCode,
  context: Values = {},
): Set<number> =>
  new Set(
    (
      buildSectionSchema(fields, country, context).safeParse(values).error
        ?.issues ?? []
    ).flatMap(({ path: [key, index] }) =>
      key === collection && typeof index === 'number' ? [index] : [],
    ),
  );

export { buildSectionSchema, itemsWithIssues };
