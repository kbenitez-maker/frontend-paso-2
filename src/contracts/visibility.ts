import type { CountryCode } from '@/types/domain';
import type {
  FieldDefinition,
  RequiredSpec,
  VisibilityExpr,
  VisibleWhen,
} from './types';

import {
  ADMINISTRATORS_REGISTERED,
  administratorsRegistered,
  owesComplementary,
  OWNERSHIP_WITHOUT_BENEFICIAL_OWNER,
  SHAREHOLDER_OWES_COMPLEMENTARY,
  withoutBeneficialOwner,
} from '@/lib/ownership';

import { catalogParentOf, isCatalogEmpty } from './catalogs';

type Values = Record<string, unknown>;

interface RequiredIssue {
  path: (string | number)[];
  message: string;
}

const REQUIRED_MESSAGE = 'required';
const MIN_ITEMS_MESSAGE = 'min_items';

const isRecord = (value: unknown): value is Values =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEmptyValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const matches = (actual: unknown, expected: unknown): boolean =>
  Array.isArray(actual) ? actual.includes(expected) : actual === expected;

/** Keys no answer holds: derived from the values a condition sees (see `EXTERNAL_CONTEXT_KEYS`). */
const COMPUTED = new Map<string, (values: Values) => unknown>([
  [SHAREHOLDER_OWES_COMPLEMENTARY, owesComplementary],
  [ADMINISTRATORS_REGISTERED, administratorsRegistered],
  [OWNERSHIP_WITHOUT_BENEFICIAL_OWNER, withoutBeneficialOwner],
]);

const valueOf = (values: Values, field: string): unknown =>
  COMPUTED.get(field)?.(values) ?? values[field];

const evaluate = (expr: VisibilityExpr, values: Values): boolean => {
  if ('always' in expr) return true;
  if ('all' in expr) return expr.all.every((item) => evaluate(item, values));
  if ('any' in expr) return expr.any.some((item) => evaluate(item, values));
  if ('eq' in expr) return matches(valueOf(values, expr.field), expr.eq);
  if ('neq' in expr) return !matches(valueOf(values, expr.field), expr.neq);
  if ('in' in expr)
    return expr.in.some((expected) =>
      matches(valueOf(values, expr.field), expected),
    );
  if ('gte' in expr) {
    const actual = valueOf(values, expr.field);
    return typeof actual === 'number' && actual >= expr.gte;
  }
  if ('code_eq' in expr) {
    return sameCatalogCode(valueOf(values, expr.field), expr.code_eq);
  }
  if ('code_neq' in expr) {
    const actual = valueOf(values, expr.field);
    return !isEmptyValue(actual) && !sameCatalogCode(actual, expr.code_neq);
  }
  if ('present' in expr) return !isEmptyValue(valueOf(values, expr.field));
  return expr satisfies never;
};

const sameCatalogCode = (actual: unknown, code: string): boolean =>
  (typeof actual === 'string' || typeof actual === 'number') &&
  String(actual).toLowerCase() === code.toLowerCase();

/**
 * Evaluates a field's visibility. A per-country map falls back to "visible"
 * for countries it does not mention.
 */
const isVisible = (
  rule: VisibleWhen | undefined,
  values: Values,
  country: CountryCode,
): boolean => {
  if (rule === undefined) return true;
  if ('always' in rule || 'field' in rule || 'all' in rule || 'any' in rule) {
    return evaluate(rule, values);
  }
  const expr = rule[country];
  return expr === undefined || evaluate(expr, values);
};

const isRequired = (spec: RequiredSpec, country: CountryCode): boolean =>
  spec === 'when_visible' || (spec[country] ?? true);

/**
 * Visibility of a collection item field: its condition sees the section scope
 * plus the sibling fields of the same item (item keys win).
 */
const isItemVisible = (
  rule: VisibleWhen | undefined,
  scope: Values,
  item: Values,
  country: CountryCode,
): boolean => isVisible(rule, { ...scope, ...item }, country);

/** Fields stored directly at one level: the section (`owner` undefined) or an item of `owner`. */
const ownFieldsOf = (
  fields: readonly FieldDefinition[],
  owner?: string,
): FieldDefinition[] => fields.filter((field) => field.collection === owner);

/**
 * Collections held directly at one level: inside an item of `owner`, its child
 * collections; at the top, the collections whose parent is not among `fields`
 * (so the fields of one child collection also stand on their own).
 */
const collectionsIn = (
  fields: readonly FieldDefinition[],
  owner?: string,
): string[] => {
  const parents = new Set(fields.map((field) => field.collection));
  const isHeldAtLevel = (parent: string | undefined): boolean => {
    if (owner !== undefined) return parent === owner;
    return parent === undefined || !parents.has(parent);
  };
  return [
    ...new Set(
      fields.flatMap(({ collection, parent_collection: parent }) =>
        (
          collection !== undefined &&
          collection !== owner &&
          isHeldAtLevel(parent)
        ) ?
          [collection]
        : [],
      ),
    ),
  ];
};

/** Saved items of a collection (none when the value is not a list). */
const itemsOf = (values: Values, name: string): unknown[] => {
  const saved = values[name];
  return Array.isArray(saved) ? saved : [];
};

/**
 * Whether a collection shows: some item field is visible for a saved item, or
 * for a new empty one when there are none. A collection hidden by a condition
 * outside its items shows no field in any item.
 */
const isCollectionShown = (
  members: readonly FieldDefinition[],
  items: readonly unknown[],
  scope: Values,
  country: CountryCode,
): boolean =>
  (items.length > 0 ? items : [{}]).some((item) =>
    members.some(
      (member) =>
        member.ui_only !== true &&
        member.countries.includes(country) &&
        isItemVisible(
          member.visible_when,
          scope,
          isRecord(item) ? item : {},
          country,
        ),
    ),
  );

/** A `hide_when_empty` catalog whose chosen parent has no rows: hidden, so never missing. */
const isEmptyCatalog = (
  field: FieldDefinition,
  scope: Values,
  country: CountryCode,
): boolean => {
  const parent = catalogParentOf(field.catalog, country);
  return (
    field.catalog?.hide_when_empty === true &&
    parent !== undefined &&
    isCatalogEmpty(field.catalog.name, scope[parent])
  );
};

/** Whether a field applies to the country and shows under the scope (and is not UI-only). */
const isFieldShown = (
  field: FieldDefinition,
  scope: Values,
  country: CountryCode,
): boolean =>
  field.ui_only !== true &&
  field.countries.includes(country) &&
  isVisible(field.visible_when, scope, country);

/** Issues of the `any_true` rules of an answered field: once every listed field that applies is answered (POC: the list was gone through), one must be "yes". */
const anyTrueIssues = (
  field: FieldDefinition,
  fields: readonly FieldDefinition[],
  owner: string | undefined,
  scope: Values,
  path: readonly (string | number)[],
  country: CountryCode,
): RequiredIssue[] => {
  const issues: RequiredIssue[] = [];
  for (const rule of field.validation ?? []) {
    if (!('any_true' in rule)) continue;
    const listed = ownFieldsOf(fields, owner).filter(
      (other) =>
        rule.any_true.includes(other.key) &&
        other.countries.includes(country) &&
        isVisible(other.visible_when, scope, country),
    );
    if (
      listed.every((other) => !isEmptyValue(scope[other.key])) &&
      !listed.some((other) => scope[other.key] === true)
    ) {
      issues.push({ path: [...path, field.key], message: rule.message_key });
    }
  }
  return issues;
};

/** Required and `any_true` gaps of the fields stored directly at one level. */
const ownFieldIssues = (
  fields: readonly FieldDefinition[],
  owner: string | undefined,
  values: Values,
  scope: Values,
  path: readonly (string | number)[],
  country: CountryCode,
): RequiredIssue[] => {
  const issues: RequiredIssue[] = [];
  for (const field of ownFieldsOf(fields, owner)) {
    const shown = isFieldShown(field, scope, country);
    const empty = isEmptyValue(values[field.key]);
    if (
      shown &&
      empty &&
      isRequired(field.required, country) &&
      !isEmptyCatalog(field, scope, country)
    ) {
      issues.push({ path: [...path, field.key], message: REQUIRED_MESSAGE });
    }
    if (shown && !empty) {
      issues.push(...anyTrueIssues(field, fields, owner, scope, path, country));
    }
  }
  return issues;
};

/** Collection-level gaps (`min_items`, `min_items_when_any`) of one collection. */
const collectionGapIssues = (
  members: readonly FieldDefinition[],
  items: readonly unknown[],
  scope: Values,
  path: readonly (string | number)[],
  country: CountryCode,
): RequiredIssue[] => {
  const issues: RequiredIssue[] = [];
  if (
    items.length < (members[0]?.min_items ?? 0) &&
    isCollectionShown(members, items, scope, country)
  ) {
    issues.push({ path: [...path], message: MIN_ITEMS_MESSAGE });
  }
  const when = members[0]?.min_items_when_any;
  if (
    when !== undefined &&
    items.length < when.min &&
    items.some(
      (item) =>
        isRecord(item) && isItemVisible(when.item, scope, item, country),
    )
  ) {
    issues.push({ path: [...path], message: when.message_key });
  }
  return issues;
};

/** Required gaps of one level, then of each item of its collections (whose scope adds the item). */
const levelIssues = (
  fields: readonly FieldDefinition[],
  owner: string | undefined,
  values: Values,
  scope: Values,
  path: readonly (string | number)[],
  country: CountryCode,
): RequiredIssue[] => {
  const issues = ownFieldIssues(fields, owner, values, scope, path, country);
  for (const name of collectionsIn(fields, owner)) {
    const items = itemsOf(values, name);
    issues.push(
      ...collectionGapIssues(
        ownFieldsOf(fields, name),
        items,
        scope,
        [...path, name],
        country,
      ),
    );
    items.forEach((item: unknown, index) => {
      if (isRecord(item)) {
        issues.push(
          ...levelIssues(
            fields,
            name,
            item,
            { ...scope, ...item },
            [...path, name, index],
            country,
          ),
        );
      }
    });
  }
  return issues;
};

/**
 * Issues for visible required fields left empty and for shown collections
 * below their `min_items`. `context` carries values of other sections that
 * visibility conditions may reference. Collection items are evaluated one by
 * one, so their fields may depend on sibling fields and, in a child
 * collection, on the fields of the parent item.
 */
const requiredFieldsIssues = (
  fields: readonly FieldDefinition[],
  values: Values,
  country: CountryCode,
  context: Values = {},
): RequiredIssue[] =>
  levelIssues(
    fields,
    undefined,
    values,
    { ...context, ...values },
    [],
    country,
  );

const MAX_PASSES = 4;

const isBlank = (value: unknown): boolean =>
  isEmptyValue(value) || (typeof value === 'number' && Number.isNaN(value));

/** Items of a child collection pruned one by one; `undefined` when the collection is hidden as a whole. */
const prunedCollection = (
  fields: readonly FieldDefinition[],
  name: string,
  saved: readonly unknown[],
  levelScope: Values,
  country: CountryCode,
): unknown[] | undefined => {
  const items = saved.map((item: unknown) =>
    isRecord(item) ?
      visibleValues(fields, name, item, levelScope, country)
    : item,
  );
  return (
      isCollectionShown(ownFieldsOf(fields, name), items, levelScope, country)
    ) ?
      items
    : undefined;
};

/** One pass over a level: blanks gone, hidden answers and hidden collections dropped. */
const visiblePass = (
  fields: readonly FieldDefinition[],
  owner: string | undefined,
  current: Values,
  scope: Values,
  country: CountryCode,
): Values => {
  const own = ownFieldsOf(fields, owner);
  const children = collectionsIn(fields, owner);
  const levelScope = { ...scope, ...current };
  const next: Values = {};
  for (const [key, value] of Object.entries(current)) {
    if (children.includes(key) && Array.isArray(value)) {
      const items = prunedCollection(fields, key, value, levelScope, country);
      if (items !== undefined) next[key] = items;
      continue;
    }
    const owners = own.filter((field) => field.key === key);
    if (
      owners.length === 0 ||
      owners.some((field) => isVisible(field.visible_when, levelScope, country))
    ) {
      next[key] = value;
    }
  }
  return next;
};

/**
 * What one level really holds (the section, or an item of `owner`): blanks
 * removed and answers their conditions hide dropped, collections hidden as a
 * whole dropped, and child collections pruned item by item. A dropped answer
 * can hide others (a stale answer keeping a follow-up visible), so it repeats
 * until nothing else changes. Keys no field owns are kept.
 */
const visibleValues = (
  fields: readonly FieldDefinition[],
  owner: string | undefined,
  values: Values,
  scope: Values,
  country: CountryCode,
): Values => {
  let current = Object.fromEntries(
    Object.entries(values).filter(([, value]) => !isBlank(value)),
  );
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const next = visiblePass(fields, owner, current, scope, country);
    if (Object.keys(next).length === Object.keys(current).length) return next;
    current = next;
  }
  return current;
};

export {
  collectionsIn,
  evaluate as evaluateVisibility,
  isCollectionShown,
  isEmptyValue,
  isItemVisible,
  isRecord,
  isRequired,
  isVisible,
  itemsOf,
  ownFieldsOf,
  requiredFieldsIssues,
  visibleValues,
  type RequiredIssue,
  type Values,
};
