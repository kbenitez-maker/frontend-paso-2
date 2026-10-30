import type {
  FieldDefinition,
  FieldType,
  Rule,
  VisibilityExpr,
} from '@/contracts/types';
import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type {
  OpeningCurrentSection,
  OpeningFieldVisibilityRule,
  OpeningSectionField,
} from '@/server/api/account-opening-requests';
import type { CatalogName } from '@/types/domain';

import { evaluateVisibility } from '@/contracts/visibility';
import { COUNTRY_CODES, isCatalogName } from '@/types/domain';

import { ownValueOf } from './own-key';

const OPENING_CATALOG_BY_CODE = {
  COUNTRY: 'countries',
  CONSTITUTION_REFORM_TYPE: 'constitution-reform-types',
  SHARE_TYPE: 'share-types',
  LEGAL_ID_TYPE: 'identification-types',
  BANK: 'other-financial-institutions',
  ACCOUNT_TYPE: 'other-institution-account-types',
  PERSON_TYPE: 'counterparty-person-types',
  CURRENCY: 'currencies',
  DEPARTMENT: 'departments',
  PROVINCE: 'provinces',
  CANTON: 'cantons',
  MUNICIPALITY: 'municipalities',
  DISTRICT: 'districts',
  SUBDISTRICT: 'subdistricts',
  SECTOR: 'sectors',
  OPERATIONAL_COVERAGE: 'operational-coverages',
  LAFISE_REGIONAL_COUNTRY: 'regional-countries',
} as const satisfies Record<string, CatalogName>;

const OPENING_FIELD_TYPE_BY_CODE = {
  text: 'string',
  date: 'date',
  catalog: 'catalog',
  yes_no: 'boolean',
  email: 'email',
  phone: 'phone',
  integer: 'integer',
  textarea: 'string',
  url: 'url',
  decimal: 'decimal',
  multi_catalog: 'multi_catalog',
} as const satisfies Record<string, FieldType>;

const FULL_WIDTH_CODES = new Set([
  'registration_date',
  'share_type_id',
  'constitution_reform_type_id',
  'bearer_share_conversion_allowed',
]);

const kebabOf = (code: string): string =>
  code.toLowerCase().replaceAll('_', '-');

// cspell:ignore aeiou
const pluralOf = (kebab: string): string =>
  /[^aeiou]y$/u.test(kebab) ? `${kebab.slice(0, -1)}ies` : `${kebab}s`;

/**
 * Portal catalog behind an opening-request `catalog_code`. Codes outside the
 * table resolve by their plural kebab name (`GENDER` → `genders`), then by
 * the singular kebab name. `undefined` when the portal has no such catalog.
 */
const openingCatalogName = (
  code: string | null | undefined,
): CatalogName | undefined => {
  if (code == null || code === '') return undefined;
  const mapped = ownValueOf(OPENING_CATALOG_BY_CODE, code);
  if (mapped !== undefined) return mapped;
  const kebab = kebabOf(code);
  const plural = pluralOf(kebab);
  if (isCatalogName(plural)) return plural;
  return isCatalogName(kebab) ? kebab : undefined;
};

/**
 * Registry field type of an API `field_type`; `undefined` for containers
 * (`collection`, `group`) and types the renderer does not paint.
 */
const openingFieldType = (fieldType: string): FieldType | undefined =>
  ownValueOf(OPENING_FIELD_TYPE_BY_CODE, fieldType);

/** Whether the field takes the whole row of the two-column section card. */
const openingFieldFullWidth = (field: OpeningSectionField): boolean =>
  field.field_type === 'yes_no' ||
  field.field_type === 'textarea' ||
  field.field_type === 'multi_catalog' ||
  FULL_WIDTH_CODES.has(field.code);

const rulesOf = (field: OpeningSectionField): Rule[] => {
  const rules: Rule[] = [];
  const validation = field.validation_rules;
  if (validation?.maxDate === 'today') rules.push({ not_future: true });
  if (validation?.minDateField !== undefined) {
    rules.push({ gte_field: validation.minDateField });
  }
  if (field.field_type === 'email') rules.push({ email: true });
  return rules;
};

/**
 * Opening-request field as a registry field the shared renderer can paint,
 * placed in the rail `block` that hosts its section. `undefined` when the
 * type, or the catalog of a catalog field, has no portal counterpart.
 */
const toOpeningFieldDefinition = (
  field: OpeningSectionField,
  block: BlockOf<StepSlug> = 'identification',
): FieldDefinition | undefined => {
  const type = openingFieldType(field.field_type);
  if (type === undefined) return undefined;
  const catalogName = openingCatalogName(field.catalog_code);
  if (
    (type === 'catalog' || type === 'multi_catalog') &&
    catalogName === undefined
  ) {
    return undefined;
  }

  const definition: FieldDefinition = {
    key: field.code,
    block,
    type,
    countries: COUNTRY_CODES,
    required: field.is_required === true ? 'when_visible' : {},
  };
  if (field.validation_rules?.maxLength !== undefined) {
    definition.max_length = field.validation_rules.maxLength;
  }
  if (field.field_type === 'textarea') definition.multiline = true;
  if (openingFieldFullWidth(field)) definition.full_width = true;
  if (catalogName !== undefined) {
    definition.catalog = { name: catalogName, source: 'api' };
  }
  const validation = rulesOf(field);
  if (validation.length > 0) definition.validation = validation;
  return definition;
};

/**
 * Fields the applicant answers as one value. A group is only a container.
 * A collection stays one code: its item fields are saved inside that array.
 */
const answerableOpeningFields = (
  fields: readonly OpeningSectionField[],
): OpeningSectionField[] =>
  fields.flatMap((field) =>
    field.field_type === 'group' ?
      answerableOpeningFields(field.children ?? [])
    : [field],
  );

/**
 * Answerable fields in API order of nesting: `collection` and `group`
 * containers are replaced by their children.
 */
const flattenOpeningFields = (
  fields: readonly OpeningSectionField[],
): OpeningSectionField[] =>
  fields.flatMap((field) => {
    const children = field.children ?? [];
    if (field.field_type === 'collection' || field.field_type === 'group') {
      return flattenOpeningFields(children);
    }
    return [field, ...flattenOpeningFields(children)];
  });

const warnUnsupportedRule = (field: string, collection?: string): void => {
  // The field module runs in the browser. The server logger pulls Node transports.
  console.warn('Unsupported visibility_rule; field hidden', {
    event: 'opening.visibility_rule_unsupported',
    field,
    ...(collection === undefined ? {} : { collection }),
  });
};

const ruleMatches = (
  rule: OpeningFieldVisibilityRule,
  values: Record<string, unknown>,
  field: string,
): boolean => {
  const expr = toVisibilityExpr(rule);
  if (expr === undefined) {
    warnUnsupportedRule(field);
    return false;
  }
  return evaluateVisibility(expr, values);
};

/**
 * Whether the field shows for the current answers: always without a
 * `visibility_rule`, otherwise once the rule's field holds the expected value.
 */
const isOpeningFieldVisible = (
  field: OpeningSectionField,
  values: Record<string, unknown>,
): boolean =>
  field.visibility_rule == null ||
  ruleMatches(field.visibility_rule, values, field.code);

/** Required always, or once its `requiredWhen` condition matches. */
const isOpeningFieldRequired = (
  field: OpeningSectionField,
  values: Record<string, unknown>,
): boolean => {
  if (field.is_required === true) return true;
  const when = field.validation_rules?.requiredWhen;
  return when != null && ruleMatches(when, values, field.code);
};

/** Fields the applicant must answer now: visible and required. */
const requiredOpeningFields = (
  section: Pick<OpeningCurrentSection, 'fields' | 'values'>,
): OpeningSectionField[] =>
  answerableOpeningFields(section.fields).filter(
    (field) =>
      isOpeningFieldVisible(field, section.values) &&
      isOpeningFieldRequired(field, section.values),
  );

const allVisibilityExpr = (rules: unknown): VisibilityExpr | undefined => {
  if (!Array.isArray(rules)) return undefined;
  const all: VisibilityExpr[] = [];
  for (const child of rules) {
    const expr = toVisibilityExpr(child as OpeningFieldVisibilityRule);
    if (expr === undefined) return undefined;
    all.push(expr);
  }
  return all.length > 0 ? { all } : undefined;
};

const equalsVisibilityExpr = (
  field: string,
  equals: unknown,
): VisibilityExpr | undefined => {
  if (
    typeof equals !== 'string' &&
    typeof equals !== 'number' &&
    typeof equals !== 'boolean'
  ) {
    return undefined;
  }
  return { field, eq: equals };
};

/** `hasValue` is typed `true`, but the API JSON is not parsed. */
const presentVisibilityExpr = (
  field: string,
  hasValue: unknown,
): VisibilityExpr | undefined =>
  hasValue === true ? { field, present: true } : undefined;

const toVisibilityExpr = (
  rule: OpeningFieldVisibilityRule,
): VisibilityExpr | undefined => {
  if ('all' in rule) return allVisibilityExpr(rule.all);
  if ('equals' in rule) return equalsVisibilityExpr(rule.field, rule.equals);
  if ('codeEquals' in rule) {
    return { field: rule.field, code_eq: rule.codeEquals };
  }
  if ('codeNotEquals' in rule) {
    return { field: rule.field, code_neq: rule.codeNotEquals };
  }
  if ('hasValue' in rule) {
    return presentVisibilityExpr(rule.field, Reflect.get(rule, 'hasValue'));
  }
  return undefined;
};

/** A collection the renderer can paint: at least one child maps to a field. */
const canPaintOpeningItems = (field: OpeningSectionField): boolean =>
  (field.children ?? []).some(
    (child) => toOpeningFieldDefinition(child) !== undefined,
  );

const ITEM_TITLE_CODES = new Set([
  'institution_name',
  'legal_name',
  'first_name',
]);

/** Item fields of an opening-request collection, for the shared collection editor. */
const openingCollectionFields = (
  collection: OpeningSectionField,
  block: BlockOf<StepSlug>,
): FieldDefinition[] =>
  (collection.children ?? []).flatMap((child) => {
    const definition = toOpeningFieldDefinition(child, block);
    if (definition === undefined) return [];
    let visibleWhen: VisibilityExpr | undefined;
    if (child.visibility_rule != null) {
      visibleWhen = toVisibilityExpr(child.visibility_rule);
      if (visibleWhen === undefined) {
        warnUnsupportedRule(child.code, collection.code);
        return [];
      }
    }
    return [
      {
        ...definition,
        collection: collection.code,
        ...(visibleWhen === undefined ? {} : { visible_when: visibleWhen }),
        ...(collection.is_required === true ? { min_items: 1 } : {}),
        ...(ITEM_TITLE_CODES.has(child.code) ?
          { item_title: true as const }
        : {}),
      },
    ];
  });

export {
  answerableOpeningFields,
  flattenOpeningFields,
  canPaintOpeningItems,
  isOpeningFieldRequired,
  isOpeningFieldVisible,
  openingCatalogName,
  openingCollectionFields,
  openingFieldFullWidth,
  openingFieldType,
  requiredOpeningFields,
  toOpeningFieldDefinition,
};
