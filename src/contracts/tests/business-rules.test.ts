import type { FieldDefinition } from '../types';

import { describe, expect, it } from 'vitest';

import {
  buildSectionSchema,
  isMissingCode,
  issueCode,
  sectionFields,
} from '@/contracts';

import { requiredFieldsIssues } from '../visibility';

type Country = 'NI' | 'CR' | 'PA' | 'DO';

/** Issues as `[path, code]`, leaving out plain missing answers. */
const ruleIssues = (
  fields: readonly FieldDefinition[],
  values: Record<string, unknown>,
  country: Country,
  context: Record<string, unknown> = {},
) => {
  const result = buildSectionSchema(fields, country, context).safeParse(values);
  return result.success ?
      []
    : result.error.issues
        .map((issue) => [issue.path.join('.'), issueCode(issue)])
        .filter(([, code]) => code !== 'required');
};

const base = {
  block: 'financial',
  countries: ['NI', 'CR', 'PA', 'DO'],
  required: 'when_visible',
  type: 'decimal',
} as const satisfies Partial<FieldDefinition>;

describe('cross-field rule kinds', () => {
  it('uses the message key of lte_field', () => {
    const fields: FieldDefinition[] = [
      { ...base, key: 'limit' },
      {
        ...base,
        key: 'value',
        validation: [{ lte_field: 'limit', message_key: 'over_limit' }],
      },
    ];

    expect(ruleIssues(fields, { limit: 5, value: 6 }, 'NI')).toEqual([
      ['value', 'over_limit'],
    ]);
    expect(ruleIssues(fields, { limit: 5, value: 5 }, 'NI')).toEqual([]);
  });

  it('checks sum_lte against fields of the item, the section and the context', () => {
    const item = { ...base, collection: 'rows' } as const;
    const fields: FieldDefinition[] = [
      {
        ...item,
        key: 'a',
        validation: [
          {
            sum_lte: { sum: ['a', 'b'], limit: ['cap'], factor: 12 },
            message_key: 'over_cap',
          },
        ],
      },
      { ...item, key: 'b' },
    ];
    const rows = [{ a: 5, b: 5 }];

    expect(ruleIssues(fields, { rows }, 'NI', { cap: 119 })).toEqual([
      ['rows.0.a', 'over_cap'],
    ]);
    expect(ruleIssues(fields, { rows }, 'NI', { cap: 120 })).toEqual([]);
    // Skipped while the limit is unknown or the field itself is empty.
    expect(ruleIssues(fields, { rows }, 'NI')).toEqual([]);
    expect(ruleIssues(fields, { rows: [{ b: 50 }] }, 'NI', { cap: 1 })).toEqual(
      [],
    );
  });

  it('asks for one "yes" among any_true once the field is answered', () => {
    const fields: FieldDefinition[] = [
      {
        ...base,
        key: 'all',
        type: 'boolean',
        validation: [{ any_true: ['x', 'y'], message_key: 'none_on' }],
      },
      { ...base, key: 'x', type: 'boolean' },
      { ...base, key: 'y', type: 'boolean' },
    ];

    expect(
      ruleIssues(fields, { all: false, x: false, y: false }, 'NI'),
    ).toEqual([['all', 'none_on']]);
    expect(ruleIssues(fields, { all: false, x: false, y: true }, 'NI')).toEqual(
      [],
    );
    expect(ruleIssues(fields, { x: false, y: false }, 'NI')).toEqual([]);
    expect(ruleIssues(fields, { all: false, x: false }, 'NI')).toEqual([]);
  });

  it('needs min_items_when_any items once some item matches', () => {
    const item = {
      ...base,
      collection: 'signers',
      type: 'catalog',
      min_items_when_any: {
        item: { field: 'kind', eq: 'joint' },
        min: 2,
        message_key: 'two_needed',
      },
    } as const;
    const fields: FieldDefinition[] = [{ ...item, key: 'kind' }];

    expect(
      requiredFieldsIssues(fields, { signers: [{ kind: 'joint' }] }, 'NI'),
    ).toEqual([{ path: ['signers'], message: 'two_needed' }]);
    expect(
      requiredFieldsIssues(
        fields,
        { signers: [{ kind: 'joint' }, { kind: 'individual' }] },
        'NI',
      ),
    ).toEqual([]);
    expect(
      requiredFieldsIssues(fields, { signers: [{ kind: 'individual' }] }, 'NI'),
    ).toEqual([]);
  });
});

describe('POC business rules in the registry', () => {
  it('keeps paid-in capital and liabilities within their limits (economic activity)', () => {
    expect(
      ruleIssues(
        sectionFields('financial'),
        {
          share_capital_usd: 100,
          paid_in_capital_usd: 101,
          total_assets: 10,
          total_liabilities: 11,
        },
        'DO',
      ),
    ).toEqual([
      ['paid_in_capital_usd', 'exceeds_share_capital'],
      ['total_liabilities', 'exceeds_total_assets'],
    ]);
  });

  it('checks account credits against the annual sales and debits against credits', () => {
    const accounts = [
      { monthly_credit_amount: 1000, monthly_debit_amount: 1200 },
    ];

    expect(
      ruleIssues(sectionFields('account-info'), { accounts }, 'NI', {
        annual_sales_usd: 11_999,
      }),
    ).toEqual([
      ['accounts.0.monthly_credit_amount', 'credits_exceed_sales'],
      ['accounts.0.monthly_debit_amount', 'debits_exceed_credits'],
    ]);
    expect(
      ruleIssues(
        sectionFields('account-info'),
        { accounts: [{ monthly_credit_amount: 1000 }] },
        'NI',
        { annual_sales_usd: 12_000 },
      ),
    ).toEqual([]);
  });

  it('checks the PA instruments: deposits against monthly sales, withdrawals against deposits', () => {
    const accounts = [
      { cash_in_amount: 600, ach_in_amount: 500, cash_out_amount: 1200 },
    ];

    expect(
      ruleIssues(sectionFields('account-info'), { accounts }, 'PA', {
        annual_sales_usd: 12_000,
      }),
    ).toEqual([
      ['accounts.0.cash_in_amount', 'credits_exceed_sales'],
      ['accounts.0.cash_out_amount', 'debits_exceed_credits'],
      ['accounts.0.ach_in_amount', 'credits_exceed_sales'],
    ]);
  });

  it('asks a joint signature for two signers in each account', () => {
    const issues = requiredFieldsIssues(
      sectionFields('account-info'),
      { accounts: [{ signers: [{ signature_type_id: 'joint' }] }] },
      'NI',
    );

    expect(issues).toContainEqual({
      path: ['accounts', 0, 'signers'],
      message: 'joint_signers',
    });
    expect(isMissingCode('joint_signers')).toBe(true);
  });

  it('asks for at least one Bancanet feature in Sí', () => {
    const features = sectionFields('features').filter(
      (field) => field.countries.includes('NI') && field.type === 'boolean',
    );
    const allNo = Object.fromEntries(
      features.map((field) => [field.key, false]),
    );

    expect(requiredFieldsIssues(features, allNo, 'NI')).toEqual([
      { path: ['mark_all_features'], message: 'no_feature_enabled' },
    ]);
    expect(
      requiredFieldsIssues(features, { ...allNo, pay_payroll: true }, 'NI'),
    ).toEqual([]);
    expect(isMissingCode('no_feature_enabled')).toBe(true);
  });

  it('refuses a shareholder parent that closes a cycle (POC cerrariaUnCiclo)', () => {
    const alfa = {
      shareholder_person_type_id: 'legal',
      shareholder_identification_type_id: 'ruc',
      shareholder_identification_number: 'J1',
      shareholder_share_percentage: 100,
    };
    const beta = {
      ...alfa,
      shareholder_identification_number: 'J2',
      shareholder_parent_company_id: 'ruc|j1',
    };
    const issues = ruleIssues(
      sectionFields('shareholders'),
      {
        shareholders: [
          { ...alfa, shareholder_parent_company_id: 'ruc|j2' },
          beta,
        ],
      },
      'NI',
    );

    expect(issues).toContainEqual([
      'shareholders.0.shareholder_parent_company_id',
      'ownership_cycle',
    ]);
  });

  it('rejects a trust administrator named as the body (POC avisoDeOrganoColectivo)', () => {
    const named = (name: string) =>
      ruleIssues(
        sectionFields('trust-administrators'),
        {
          trust_administrators: [
            {
              trust_admin_person_type_id: 'natural',
              trust_admin_first_name: name,
            },
          ],
        },
        'NI',
      ).filter(([, code]) => code === 'body_name');

    expect(named('Comité técnico')).toHaveLength(1);
    expect(named('La Junta Directiva')).toHaveLength(1);
    expect(named('Órgano')).toHaveLength(1);
    expect(named('Comitente')).toEqual([]);
    expect(named('Juan Comité')).toEqual([]);
  });

  it('rejects a lone committee record holding every position (POC comiteEnBloque)', () => {
    const member = (positions: string[]) => ({
      trust_admin_role_ids: ['technical-committee'],
      trust_admin_committee_position_ids: positions,
    });
    const codes = (items: Record<string, unknown>[]) =>
      ruleIssues(
        sectionFields('trust-administrators'),
        { trust_administrators: items },
        'NI',
      ).filter(([path]) => path === 'trust_administrators');

    expect(codes([member(['president', 'secretary', 'member'])])).toEqual([
      ['trust_administrators', 'committee_as_one'],
    ]);
    expect(codes([member(['president', 'secretary'])])).toEqual([]);
    expect(
      codes([member(['president', 'secretary', 'member']), member(['member'])]),
    ).toEqual([]);
  });

  it('rejects a trust party written as a class (POC avisoDeClase)', () => {
    // The trade name is asked in PA, CR and HN.
    const named = (key: string, name: string) =>
      ruleIssues(
        sectionFields('trust-parties'),
        { trust_parties: [{ [key]: name }] },
        'PA',
      ).filter(([, code]) => code === 'party_as_class');

    expect(
      named('trust_party_first_name', 'los hijos del fideicomitente'),
    ).toHaveLength(1);
    expect(
      named('trust_party_legal_name', 'Herederos legales de Juan'),
    ).toHaveLength(1);
    expect(named('trust_party_trade_name', 'A quien corresponda')).toHaveLength(
      1,
    );
    expect(named('trust_party_first_name', 'Carlos')).toEqual([]);
  });
});
