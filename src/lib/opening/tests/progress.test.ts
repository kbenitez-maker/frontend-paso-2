import type { OpeningSectionField } from '@/server/api';

import { describe, expect, it } from 'vitest';

import {
  openingSectionFieldCount,
  openingStepPercent,
  openingStepState,
} from '@/lib/opening';

const field = (
  overrides: Partial<OpeningSectionField> & Pick<OpeningSectionField, 'code'>,
): OpeningSectionField => ({
  display_name: overrides.code,
  field_type: 'text',
  display_order: 1,
  ...overrides,
});

describe('openingSectionFieldCount', () => {
  it('counts visible required fields and skips optional and hidden ones', () => {
    expect(
      openingSectionFieldCount({
        fields: [
          field({
            code: 'address_country_id',
            field_type: 'catalog',
            catalog_code: 'COUNTRY',
            is_required: true,
          }),
          field({
            code: 'province_id',
            field_type: 'catalog',
            catalog_code: 'DEPARTMENT',
            is_required: true,
          }),
          field({ code: 'street', field_type: 'text', is_required: true }),
          field({ code: 'building', field_type: 'text' }),
          field({
            code: 'constitution_reform_type_id',
            field_type: 'catalog',
            is_required: true,
            visibility_rule: { field: 'had_constitution_reform', equals: true },
          }),
        ],
        values: { address_country_id: 'PA', building: 'Torre 1' },
      }),
    ).toEqual({ completed_fields: 1, total_fields: 3 });
  });

  it('counts a field required by requiredWhen once its condition matches', () => {
    const reason = field({
      code: 'cicac_refusal_reason_id',
      field_type: 'catalog',
      catalog_code: 'CICAC_REFUSAL_REASON',
      validation_rules: {
        requiredWhen: { field: 'cicac_consent', equals: false },
      },
    });

    expect(openingSectionFieldCount({ fields: [reason], values: {} })).toEqual({
      completed_fields: 0,
      total_fields: 0,
    });
    expect(
      openingSectionFieldCount({
        fields: [reason],
        values: { cicac_consent: false },
      }),
    ).toEqual({ completed_fields: 0, total_fields: 1 });
  });

  it('treats a answered yes/no as filled and an empty phone as empty', () => {
    expect(
      openingSectionFieldCount({
        fields: [
          field({
            code: 'in_free_trade_zone',
            field_type: 'yes_no',
            is_required: true,
          }),
          field({
            code: 'company_phone',
            field_type: 'phone',
            is_required: true,
          }),
        ],
        values: {
          in_free_trade_zone: false,
          company_phone: { dial_code: '+507', number: '' },
        },
      }),
    ).toEqual({ completed_fields: 1, total_fields: 2 });
  });

  it('leaves out a required field the screen cannot paint', () => {
    expect(
      openingSectionFieldCount(
        {
          fields: [
            field({
              code: 'company_signature',
              field_type: 'signature',
              is_required: true,
            }),
            field({
              code: 'company_phone',
              field_type: 'phone',
              is_required: true,
            }),
            field({ code: 'legal_name', is_required: true }),
          ],
          values: { legal_name: 'Empresa S.A.' },
        },
        { bankId: 'BLPA', country: undefined },
      ),
    ).toEqual({ completed_fields: 1, total_fields: 1 });
  });

  it('leaves out a catalog the screen cannot load', () => {
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

    expect(
      openingSectionFieldCount(section, { bankId: undefined, country: 'PA' }),
    ).toEqual({ completed_fields: 1, total_fields: 1 });
    expect(
      openingSectionFieldCount(section, { bankId: 'BLPA', country: 'PA' }),
    ).toEqual({ completed_fields: 1, total_fields: 2 });
  });
});

describe('openingStepState', () => {
  it('reads the step state from its section counts', () => {
    expect(openingStepState([])).toBe('not_started');
    expect(
      openingStepState([
        { key: 'contact', completed_fields: 0, total_fields: 2 },
      ]),
    ).toBe('not_started');
    expect(
      openingStepState([
        { key: 'contact', completed_fields: 2, total_fields: 2 },
        { key: 'identification', completed_fields: 0, total_fields: 4 },
      ]),
    ).toBe('in_progress');
    expect(
      openingStepState([
        { key: 'contact', completed_fields: 2, total_fields: 2 },
      ]),
    ).toBe('complete');
  });

  it('rounds the step percent over every required field', () => {
    expect(
      openingStepPercent([
        { key: 'contact', completed_fields: 2, total_fields: 2 },
        { key: 'identification', completed_fields: 0, total_fields: 4 },
      ]),
    ).toBe(33);
    expect(openingStepPercent([])).toBe(0);
  });
});
