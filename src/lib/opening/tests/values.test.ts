import type { OpeningSectionField } from '@/server/api';

import { describe, expect, it } from 'vitest';

import {
  mergeOpeningSectionValues,
  missingOpeningRequiredFields,
  openingAnswerPayload,
  openingSectionValues,
  savableAnswerPayload,
} from '@/lib/opening';

const field = (
  overrides: Partial<OpeningSectionField> & Pick<OpeningSectionField, 'code'>,
): OpeningSectionField => ({
  display_name: overrides.code,
  field_type: 'text',
  display_order: 1,
  ...overrides,
});

const answerable = { bankId: 'BLPA', country: 'PA' } as const;

describe('missingOpeningRequiredFields', () => {
  it('lists the visible required fields Continue still needs', () => {
    expect(
      missingOpeningRequiredFields({
        fields: [
          field({ code: 'legal_name', is_required: true }),
          field({ code: 'trade_name' }),
          field({ code: 'company_email', is_required: true }),
          field({
            code: 'constitution_reform_type_id',
            is_required: true,
            visibility_rule: { field: 'had_constitution_reform', equals: true },
          }),
        ],
        values: { legal_name: 'Empresa S.A.' },
      }),
    ).toEqual(['company_email']);
  });

  it('does not hold Continue on a catalog the screen cannot load', () => {
    const section = {
      fields: [
        field({
          code: 'incorporation_country_id',
          field_type: 'catalog',
          catalog_code: 'COUNTRY',
          is_required: true,
        }),
        field({ code: 'legal_name', is_required: true }),
      ],
      values: { legal_name: 'Empresa S.A.' },
    };

    expect(missingOpeningRequiredFields(section)).toEqual([
      'incorporation_country_id',
    ]);
    expect(missingOpeningRequiredFields(section, answerable)).toEqual([
      'incorporation_country_id',
    ]);
    expect(
      missingOpeningRequiredFields(section, {
        ...answerable,
        bankId: undefined,
      }),
    ).toEqual([]);
  });

  it('does not hold Continue on required fields that cannot render', () => {
    const section = {
      fields: [
        field({
          code: 'company_phone_unrendered',
          field_type: 'phone',
          is_required: true,
        }),
        field({
          code: 'company_signature',
          field_type: 'signature',
          is_required: true,
        }),
        field({
          code: 'unmapped_catalog_id',
          field_type: 'catalog',
          catalog_code: 'UNKNOWN',
          is_required: true,
        }),
        field({ code: 'legal_name', is_required: true }),
      ],
      values: {},
    };
    const noCountry = { ...answerable, country: undefined };

    expect(missingOpeningRequiredFields(section, noCountry)).toEqual([
      'legal_name',
    ]);
    expect(missingOpeningRequiredFields(section, answerable)).toEqual([
      'company_phone_unrendered',
      'legal_name',
    ]);
  });

  it('counts a collection only when the screen can paint an item', () => {
    const collection = field({
      code: 'financial_institutions',
      field_type: 'collection',
      is_required: true,
      children: [field({ code: 'institution_name' })],
    });
    const emptyItems = field({
      code: 'seals',
      field_type: 'collection',
      is_required: true,
      children: [field({ code: 'seal', field_type: 'signature' })],
    });
    const context = { bankId: 'BLNI', country: 'NI' };

    expect(
      missingOpeningRequiredFields(
        { fields: [collection], values: {} },
        context,
      ),
    ).toEqual(['financial_institutions']);
    expect(
      missingOpeningRequiredFields(
        { fields: [collection], values: {} },
        { bankId: undefined, country: 'NI' },
      ),
    ).toEqual([]);
    expect(
      missingOpeningRequiredFields(
        { fields: [emptyItems], values: {} },
        context,
      ),
    ).toEqual([]);
  });
});

describe('mergeOpeningSectionValues', () => {
  it('writes the section answers inside its key and lifts stale root copies', () => {
    expect(
      mergeOpeningSectionValues(
        {
          location: { street: 'Calle 1' },
          legal_name: 'Old',
          trade_name: 'Old',
          identification: { trade_name: 'sss' },
        },
        'identification',
        [
          field({ code: 'legal_name' }),
          field({ code: 'trade_name' }),
          field({
            code: 'constitution_reform_type_id',
            visibility_rule: { field: 'had_constitution_reform', equals: true },
          }),
        ],
        {
          legal_name: 'New',
          trade_name: '',
          constitution_reform_type_id: 3,
          had_constitution_reform: false,
        },
      ),
    ).toEqual({
      location: { street: 'Calle 1' },
      identification: { legal_name: 'New', trade_name: '' },
    });
  });

  it('saves a collection under its own code instead of its item fields', () => {
    const items = [{ institution_name: 'Banco' }];

    expect(
      mergeOpeningSectionValues(
        {},
        'financial',
        [
          field({
            code: 'financial_institutions',
            field_type: 'collection',
            children: [field({ code: 'institution_name' })],
          }),
        ],
        { financial_institutions: items },
      ),
    ).toEqual({ financial: { financial_institutions: items } });
  });
});

describe('openingSectionValues', () => {
  it('reads the section object and lets a root copy win until the next save', () => {
    const fields = [
      field({ code: 'legal_name' }),
      field({ code: 'trade_name' }),
    ];

    expect(
      openingSectionValues(
        {
          legal_name: 'hhhh',
          trade_name: 'ffff',
          identification: { trade_name: 'sss' },
          incorporation_date: '2026-10-01',
        },
        'identification',
        fields,
      ),
    ).toEqual({ trade_name: 'ffff', legal_name: 'hhhh' });
  });
});

describe('openingAnswerPayload', () => {
  it('reads a payload object and treats a missing one as no answers', () => {
    expect(openingAnswerPayload({ payload: { contact: {} } })).toEqual({
      contact: {},
    });
    expect(openingAnswerPayload({})).toEqual({});
    expect(openingAnswerPayload(undefined)).toEqual({});
    expect(openingAnswerPayload({ payload: null })).toEqual({});
  });

  it('reads a malformed payload as no answers', () => {
    expect(openingAnswerPayload({ payload: [] })).toEqual({});
    expect(openingAnswerPayload({ payload: 'legal_name' })).toEqual({});
  });
});

describe('savableAnswerPayload', () => {
  it('merges an object and treats a missing payload as empty', () => {
    expect(savableAnswerPayload({ payload: { contact: {} } })).toEqual({
      contact: {},
    });
    expect(savableAnswerPayload({})).toEqual({});
    expect(savableAnswerPayload({ payload: undefined })).toEqual({});
    expect(savableAnswerPayload({ payload: null })).toEqual({});
  });

  it('refuses a payload that is not an object', () => {
    expect(() => savableAnswerPayload({ payload: [] })).toThrow(
      new TypeError('Opening step answer payload is not an object'),
    );
    expect(() => savableAnswerPayload({ payload: 'legal_name' })).toThrow(
      new TypeError('Opening step answer payload is not an object'),
    );
  });
});
