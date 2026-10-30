import type {
  OpeningFieldVisibilityRule,
  OpeningSectionField,
} from '@/server/api';

import { describe, expect, it, vi } from 'vitest';

import {
  flattenOpeningFields,
  isOpeningFieldRequired,
  isOpeningFieldVisible,
  requiredOpeningFields,
  toOpeningFieldDefinition,
} from '@/lib/opening';

import {
  openingCatalogName,
  openingCollectionFields,
  openingFieldFullWidth,
  openingFieldType,
} from '../fields';

const field = (
  overrides: Partial<OpeningSectionField> & Pick<OpeningSectionField, 'code'>,
): OpeningSectionField => ({
  display_name: overrides.code,
  field_type: 'text',
  display_order: 1,
  ...overrides,
});

describe('openingCatalogName', () => {
  it('maps the opening-request catalog codes onto portal catalog names', () => {
    expect(openingCatalogName(null)).toBeUndefined();
    expect(openingCatalogName('COUNTRY')).toBe('countries');
    expect(openingCatalogName('CONSTITUTION_REFORM_TYPE')).toBe(
      'constitution-reform-types',
    );
    expect(openingCatalogName('SHARE_TYPE')).toBe('share-types');
    expect(openingCatalogName('LEGAL_ID_TYPE')).toBe('identification-types');
    expect(openingCatalogName('DEPARTMENT')).toBe('departments');
    expect(openingCatalogName('OPERATIONAL_COVERAGE')).toBe(
      'operational-coverages',
    );
    expect(openingCatalogName('LAFISE_REGIONAL_COUNTRY')).toBe(
      'regional-countries',
    );
    expect(openingCatalogName('CICAC_REFUSAL_REASON')).toBe(
      'cicac-refusal-reasons',
    );
    expect(openingCatalogName('FREE_TRADE_ZONE')).toBe('free-trade-zones');
    expect(openingCatalogName('GENDER')).toBe('genders');
    expect(openingCatalogName('COMPANY_CATEGORY')).toBe('company-categories');
    expect(openingCatalogName('LEGAL_ENTITY_TYPE')).toBe('legal-entity-types');
    expect(openingCatalogName('PERSON_TYPE')).toBe('counterparty-person-types');
    expect(openingCatalogName('BANK')).toBe('other-financial-institutions');
    expect(openingCatalogName('UNKNOWN')).toBeUndefined();
    expect(openingCatalogName(undefined)).toBeUndefined();
  });

  it('does not resolve inherited object keys as catalog codes', () => {
    expect(openingCatalogName('constructor')).toBeUndefined();
    expect(openingCatalogName('toString')).toBeUndefined();
    expect(openingCatalogName('__proto__')).toBeUndefined();
  });
});

describe('openingFieldType', () => {
  it('maps API field types onto registry field types', () => {
    expect(openingFieldType('text')).toBe('string');
    expect(openingFieldType('date')).toBe('date');
    expect(openingFieldType('catalog')).toBe('catalog');
    expect(openingFieldType('yes_no')).toBe('boolean');
    expect(openingFieldType('email')).toBe('email');
    expect(openingFieldType('phone')).toBe('phone');
    expect(openingFieldType('integer')).toBe('integer');
    expect(openingFieldType('textarea')).toBe('string');
    expect(openingFieldType('multi_catalog')).toBe('multi_catalog');
    expect(openingFieldType('collection')).toBeUndefined();
    expect(openingFieldType('group')).toBeUndefined();
  });

  it('does not resolve inherited object keys as field types', () => {
    expect(openingFieldType('toString')).toBeUndefined();
    expect(openingFieldType('hasOwnProperty')).toBeUndefined();
  });
});

describe('flattenOpeningFields', () => {
  it('lifts collection children so the card can paint them', () => {
    const flattened = flattenOpeningFields([
      field({ code: 'has_additional_branches', field_type: 'yes_no' }),
      field({
        code: 'additional_branches',
        field_type: 'collection',
        children: [
          field({
            code: 'branch_country_id',
            field_type: 'catalog',
            catalog_code: 'COUNTRY',
          }),
          field({ code: 'branch_address_detail', field_type: 'textarea' }),
        ],
      }),
    ]);

    expect(flattened.map((item) => item.code)).toEqual([
      'has_additional_branches',
      'branch_country_id',
      'branch_address_detail',
    ]);
  });
});

describe('openingFieldFullWidth', () => {
  it('gives yes/no questions and trailing catalogs the whole row', () => {
    expect(openingFieldFullWidth(field({ code: 'legal_name' }))).toBe(false);
    expect(
      openingFieldFullWidth(
        field({ code: 'had_constitution_reform', field_type: 'yes_no' }),
      ),
    ).toBe(true);
    expect(openingFieldFullWidth(field({ code: 'share_type_id' }))).toBe(true);
    expect(openingFieldFullWidth(field({ code: 'registration_date' }))).toBe(
      true,
    );
  });
});

describe('isOpeningFieldVisible', () => {
  it('hides fields until their visibility rule matches the current values', () => {
    const reformType = field({
      code: 'constitution_reform_type_id',
      visibility_rule: { field: 'had_constitution_reform', equals: true },
    });

    expect(isOpeningFieldVisible(reformType, {})).toBe(false);
    expect(
      isOpeningFieldVisible(reformType, { had_constitution_reform: true }),
    ).toBe(true);
  });

  it('hides a field until every condition in all matches', () => {
    const exchangeName = field({
      code: 'stock_exchange_name',
      visibility_rule: {
        all: [
          { field: 'listed_on_stock_exchange', equals: true },
          { field: 'stock_exchange_id', codeEquals: 'OTHER' },
        ],
      },
    });

    expect(isOpeningFieldVisible(exchangeName, {})).toBe(false);
    expect(
      isOpeningFieldVisible(exchangeName, { listed_on_stock_exchange: true }),
    ).toBe(false);
    expect(
      isOpeningFieldVisible(exchangeName, {
        listed_on_stock_exchange: true,
        stock_exchange_id: 'other',
      }),
    ).toBe(true);
  });

  it('hides a codeNotEquals field until a different catalog code is chosen', () => {
    const started = field({
      code: 'relationship_start_date',
      visibility_rule: {
        field: 'institution_bank_id',
        codeNotEquals: 'OTHER',
      },
    });

    expect(isOpeningFieldVisible(started, {})).toBe(false);
    expect(
      isOpeningFieldVisible(started, { institution_bank_id: 'other' }),
    ).toBe(false);
    expect(isOpeningFieldVisible(started, { institution_bank_id: 'bac' })).toBe(
      true,
    );
  });

  it('hides a hasValue field until its catalog has an answer', () => {
    const identification = field({
      code: 'identification_number',
      visibility_rule: { field: 'person_type_id', hasValue: true },
    });

    expect(isOpeningFieldVisible(identification, {})).toBe(false);
    expect(
      isOpeningFieldVisible(identification, { person_type_id: 'legal' }),
    ).toBe(true);
  });

  it('shows a field when the API sends a null visibility rule', () => {
    const open = field({
      code: 'business_purpose',
      visibility_rule: null,
    });

    expect(isOpeningFieldVisible(open, {})).toBe(true);
  });

  it('hides a field when one condition of all cannot be evaluated', () => {
    const hidden = field({
      code: 'stock_exchange_name',
      visibility_rule: {
        all: [
          { field: 'listed_on_stock_exchange', equals: true },
          { field: 'stock_exchange_id' } as OpeningFieldVisibilityRule,
        ],
      },
    });

    expect(
      isOpeningFieldVisible(hidden, { listed_on_stock_exchange: true }),
    ).toBe(false);
  });

  it('hides a field when hasValue is not true or equals is not a scalar', () => {
    const hasValue = field({
      code: 'exchange',
      visibility_rule: {
        field: 'listed',
        hasValue: false,
      } as unknown as OpeningFieldVisibilityRule,
    });
    const equals = field({
      code: 'exchange',
      visibility_rule: {
        field: 'listed',
        equals: null,
      } as unknown as OpeningFieldVisibilityRule,
    });

    expect(isOpeningFieldVisible(hasValue, { listed: 'yes' })).toBe(false);
    expect(isOpeningFieldVisible(equals, { listed: null })).toBe(false);
  });

  it('drops a collection item whose visibility rule cannot be evaluated', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const items = openingCollectionFields(
      field({
        code: 'financial_institutions',
        field_type: 'collection',
        children: [
          field({ code: 'institution_name' }),
          field({
            code: 'stock_exchange_name',
            visibility_rule: {
              field: 'stock_exchange_id',
            } as OpeningFieldVisibilityRule,
          }),
        ],
      }),
      'activity',
    );

    expect(items.map((item) => item.key)).toEqual(['institution_name']);
    expect(warn).toHaveBeenCalledWith(
      'Unsupported visibility_rule; field hidden',
      expect.objectContaining({
        event: 'opening.visibility_rule_unsupported',
        field: 'stock_exchange_name',
        collection: 'financial_institutions',
      }),
    );
    warn.mockRestore();
  });
});

describe('isOpeningFieldRequired', () => {
  it('requires a requiredWhen field only once its condition matches', () => {
    const reason = field({
      code: 'cicac_refusal_reason_id',
      validation_rules: {
        requiredWhen: { field: 'cicac_consent', equals: false },
      },
    });

    expect(isOpeningFieldRequired(reason, {})).toBe(false);
    expect(isOpeningFieldRequired(reason, { cicac_consent: false })).toBe(true);
  });
});

describe('requiredOpeningFields', () => {
  it('lists the visible required fields of a section', () => {
    expect(
      requiredOpeningFields({
        fields: [
          field({ code: 'legal_name', is_required: true }),
          field({ code: 'trade_name' }),
          field({
            code: 'constitution_reform_type_id',
            is_required: true,
            visibility_rule: { field: 'had_constitution_reform', equals: true },
          }),
        ],
        values: {},
      }).map((item) => item.code),
    ).toEqual(['legal_name']);
  });
});

describe('toOpeningFieldDefinition', () => {
  it('turns an API text field into a registry field the Onyx renderer can paint', () => {
    const definition = toOpeningFieldDefinition(
      field({
        code: 'legal_name',
        display_name: 'Razón social de la empresa',
        is_required: true,
        validation_rules: { maxLength: 200 },
      }),
    );

    expect(definition).toMatchObject({
      key: 'legal_name',
      block: 'identification',
      type: 'string',
      required: 'when_visible',
      max_length: 200,
    });
  });

  it('attaches the portal catalog of a catalog field', () => {
    const definition = toOpeningFieldDefinition(
      field({
        code: 'incorporation_country_id',
        field_type: 'catalog',
        catalog_code: 'COUNTRY',
      }),
    );

    expect(definition?.catalog).toEqual({ name: 'countries', source: 'api' });
  });

  it('attaches the CICAC refusal catalog so the follow-up can paint', () => {
    const definition = toOpeningFieldDefinition(
      field({
        code: 'cicac_refusal_reason_id',
        field_type: 'catalog',
        catalog_code: 'CICAC_REFUSAL_REASON',
      }),
      'declarations',
    );

    expect(definition?.catalog).toEqual({
      name: 'cicac-refusal-reasons',
      source: 'api',
    });
  });

  it('marks textarea fields as full-width multiline strings', () => {
    const definition = toOpeningFieldDefinition(
      field({ code: 'branch_address_detail', field_type: 'textarea' }),
      'branches',
    );

    expect(definition).toMatchObject({
      key: 'branch_address_detail',
      block: 'branches',
      type: 'string',
      multiline: true,
      full_width: true,
    });
  });

  it('has no definition for an unknown type or an unmapped catalog', () => {
    expect(
      toOpeningFieldDefinition(field({ code: 'x', field_type: 'toString' })),
    ).toBeUndefined();
    expect(
      toOpeningFieldDefinition(
        field({ code: 'y', field_type: 'catalog', catalog_code: 'UNKNOWN' }),
      ),
    ).toBeUndefined();
  });
});
