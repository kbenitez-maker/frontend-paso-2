import type { FieldDefinition, VisibilityExpr } from '../types';

import { describe, expect, it } from 'vitest';

import {
  buildSectionSchema,
  companyFields,
  CONTRACT_STEPS,
  contractOf,
  isMissingCode,
  issueCode,
  isVisible,
  requiredFieldsIssues,
  sectionFields,
  stepFields,
} from '@/contracts';
import { identificationSchemaFor } from '@/contracts/generated/company';
import { bancanetFixtures } from '@/test/fixtures/generated/bancanet';
import { companyFixtures } from '@/test/fixtures/generated/company';
import { economicActivityFixtures } from '@/test/fixtures/generated/economic-activity';
import { referencesAccountsFixtures } from '@/test/fixtures/generated/references-accounts';
import { relatedPartiesFixtures } from '@/test/fixtures/generated/related-parties';
import { COUNTRY_CODES, isCatalogName } from '@/types/domain';

const fixtures: Partial<Record<string, Record<string, unknown>>> = {
  ...companyFixtures,
  ...economicActivityFixtures,
  ...relatedPartiesFixtures,
  ...referencesAccountsFixtures,
  ...bancanetFixtures,
};

describe('isVisible', () => {
  const values = { kind: 'sa', flag: true, count: 3, tags: ['a', 'other'] };

  it.each<[string, VisibilityExpr | undefined, boolean]>([
    ['no rule', undefined, true],
    ['always', { always: true }, true],
    ['eq', { field: 'kind', eq: 'sa' }, true],
    ['neq', { field: 'kind', neq: 'sa' }, false],
    ['in', { field: 'kind', in: ['x', 'sa'] }, true],
    ['gte', { field: 'count', gte: 4 }, false],
    ['eq on array values', { field: 'tags', eq: 'other' }, true],
    [
      'all',
      {
        all: [
          { field: 'flag', eq: true },
          { field: 'kind', eq: 'x' },
        ],
      },
      false,
    ],
    [
      'any',
      {
        any: [
          { field: 'flag', eq: false },
          { field: 'kind', eq: 'sa' },
        ],
      },
      true,
    ],
  ])('evaluates %s', (_name, rule, expected) => {
    expect(isVisible(rule, values, 'NI')).toBe(expected);
  });

  it('resolves per-country maps and defaults to visible', () => {
    const rule = { HN: { field: 'kind', eq: 'x' } };

    expect(isVisible(rule, values, 'HN')).toBe(false);
    expect(isVisible(rule, values, 'NI')).toBe(true);
  });

  it.each<[string, VisibilityExpr, Record<string, unknown>, boolean]>([
    [
      'code_eq ignores case',
      { field: 'k', code_eq: 'OTHER' },
      { k: 'other' },
      true,
    ],
    ['code_eq on a number', { field: 'k', code_eq: '7' }, { k: 7 }, true],
    ['code_neq empty', { field: 'k', code_neq: 'OTHER' }, { k: '' }, false],
    ['code_neq other', { field: 'k', code_neq: 'OTHER' }, { k: 'BANK' }, true],
    ['present blank', { field: 'k', present: true }, { k: '' }, false],
    ['present zero', { field: 'k', present: true }, { k: 0 }, true],
  ])('evaluates %s', (_name, rule, row, expected) => {
    expect(isVisible(rule, row, 'NI')).toBe(expected);
  });
});

describe('requiredFieldsIssues', () => {
  it('skips hidden and non-applicable fields', () => {
    const issues = requiredFieldsIssues(
      [
        {
          key: 'a',
          block: 'identification',
          type: 'string',
          countries: ['NI'],
          required: 'when_visible',
        },
        {
          key: 'b',
          block: 'identification',
          type: 'string',
          countries: ['NI'],
          required: 'when_visible',
          visible_when: { field: 'x', eq: 1 },
        },
        {
          key: 'c',
          block: 'identification',
          type: 'string',
          countries: ['PA'],
          required: 'when_visible',
        },
        {
          key: 'd',
          block: 'identification',
          type: 'string',
          countries: ['NI'],
          required: { NI: false },
        },
      ],
      {},
      'NI',
    );

    expect(issues).toEqual([{ path: ['a'], message: 'required' }]);
  });
});

describe('requiredFieldsIssues in collections', () => {
  it('evaluates item conditions against the sibling fields of each item', () => {
    const item = {
      block: 'identification',
      type: 'string',
      countries: ['NI'],
      required: 'when_visible',
      collection: 'people',
    } as const;
    const issues = requiredFieldsIssues(
      [
        { ...item, key: 'kind' },
        {
          ...item,
          key: 'legal_name',
          visible_when: { field: 'kind', eq: 'legal' },
        },
      ],
      { people: [{ kind: 'legal' }, { kind: 'natural' }] },
      'NI',
    );

    expect(issues).toEqual([
      { path: ['people', 0, 'legal_name'], message: 'required' },
    ]);
  });
});

describe('nested collections', () => {
  const account = {
    block: 'accounts',
    type: 'boolean',
    countries: ['NI'],
    required: 'when_visible',
    collection: 'accounts',
  } as const;
  const card = {
    block: 'accounts',
    type: 'string',
    countries: ['NI'],
    required: 'when_visible',
    collection: 'cards',
    parent_collection: 'accounts',
    min_items: 1,
    max_items: 2,
    visible_when: { field: 'wants_card', eq: true },
  } as const;
  const fields: FieldDefinition[] = [
    { ...account, key: 'wants_card' },
    { ...card, key: 'holder' },
  ];
  const issues = (values: Record<string, unknown>) => {
    const result = buildSectionSchema(fields, 'NI').safeParse(values);
    return result.success ?
        []
      : result.error.issues.map((issue) => [
          issue.path.join('.'),
          issueCode(issue),
        ]);
  };

  it('validates child items under the parent item and its answers', () => {
    expect(
      issues({
        accounts: [
          { wants_card: true, cards: [{ holder: 'Ana' }, {}] },
          { wants_card: false },
        ],
      }),
    ).toEqual([['accounts.0.cards.1.holder', 'required']]);
  });

  it('asks for the child minimum only while the parent item shows the child', () => {
    expect(issues({ accounts: [{ wants_card: true }] })).toEqual([
      ['accounts.0.cards', 'min_items'],
    ]);
    expect(issues({ accounts: [{ wants_card: false }] })).toEqual([]);
  });

  it('caps the child items and types their fields', () => {
    expect(
      issues({
        accounts: [
          {
            wants_card: true,
            cards: [{ holder: 'a' }, { holder: 'b' }, { holder: 'c' }],
          },
        ],
      }),
    ).toEqual([['accounts.0.cards', 'max_items']]);
    expect(
      issues({ accounts: [{ wants_card: true, cards: [{ holder: 1 }] }] }),
    ).toEqual([['accounts.0.cards.0.holder', 'invalid']]);
  });

  it('validates the fields of a child collection on their own (the child item editor)', () => {
    const result = buildSectionSchema([{ ...card, key: 'holder' }], 'NI', {
      wants_card: true,
    }).safeParse({ cards: [{}] });

    expect(result.success).toBe(false);
  });
});

describe('collection limits and phones', () => {
  const item = (extra: Partial<FieldDefinition> = {}): FieldDefinition => ({
    key: 'name',
    block: 'identification',
    type: 'string',
    countries: COUNTRY_CODES,
    required: 'when_visible',
    collection: 'people',
    min_items: 2,
    max_items: 3,
    ...extra,
  });
  const codes = (
    fields: FieldDefinition[],
    values: Record<string, unknown>,
  ) => {
    const result = buildSectionSchema(fields, 'NI').safeParse(values);
    return result.success ? [] : result.error.issues.map(issueCode);
  };

  it('asks for min_items while the collection shows and caps max_items', () => {
    expect(codes([item()], { people: [{ name: 'a' }] })).toEqual(['min_items']);
    expect(codes([item()], { people: [{ name: 'a' }, { name: 'b' }] })).toEqual(
      [],
    );
    expect(
      codes([item()], {
        people: Array.from({ length: 4 }, () => ({ name: 'a' })),
      }),
    ).toEqual(['max_items']);
    expect(isMissingCode('min_items')).toBe(true);
  });

  it('needs no items when a section condition hides the collection', () => {
    const hidden = item({ visible_when: { field: 'has_people', eq: true } });
    const flag: FieldDefinition = {
      key: 'has_people',
      block: 'identification',
      type: 'boolean',
      countries: COUNTRY_CODES,
      required: 'when_visible',
    };

    expect(codes([flag, hidden], { has_people: false })).toEqual([]);
    expect(codes([flag, hidden], { has_people: true })).toEqual(['min_items']);
  });

  it('validates a phone as dial code plus national digits', () => {
    const phone: FieldDefinition = {
      key: 'phone',
      block: 'identification',
      type: 'phone',
      countries: COUNTRY_CODES,
      required: 'when_visible',
    };

    expect(
      codes([phone], { phone: { dial_code: '+505', number: '88887777' } }),
    ).toEqual([]);
    expect(
      codes([phone], { phone: { dial_code: '505', number: '8888' } }),
    ).toEqual(['phone']);
  });
});

describe('generated step contracts', () => {
  it.each(CONTRACT_STEPS)(
    '%s: the fixtures pass every section schema in every country',
    (step) => {
      for (const section of contractOf(step).sectionKeys) {
        for (const country of COUNTRY_CODES) {
          const result = buildSectionSchema(
            sectionFields(section),
            country,
          ).safeParse(fixtures[section]?.[country]);

          expect(result.success, `${section}/${country}`).toBe(true);
        }
      }
    },
  );

  it.each(CONTRACT_STEPS)(
    '%s: only references catalogs the app knows by name',
    (step) => {
      // A request-scoped catalog lists the request's people, not a bank catalog.
      const names = stepFields(step).flatMap(({ field }) =>
        field.catalog === undefined || field.catalog.source === 'request' ?
          []
        : [field.catalog.name],
      );

      expect(names.filter((name) => !isCatalogName(name))).toEqual([]);
    },
  );
});

describe('generated company schemas', () => {
  it('rejects a missing required visible field', () => {
    const { legal_name: _omitted, ...rest } = companyFixtures.identification.NI;
    const result = identificationSchemaFor('NI').safeParse(rest);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['legal_name']);
  });

  it('requires a conditional field only while it is visible', () => {
    const fixture = companyFixtures.identification.NI;
    const { constitution_reform_type_id: _omitted, ...withoutType } = fixture;

    expect(identificationSchemaFor('NI').safeParse(withoutType).success).toBe(
      false,
    );
    expect(
      identificationSchemaFor('NI').safeParse({
        ...withoutType,
        had_constitution_reform: false,
      }).success,
    ).toBe(true);
  });

  it('applies base validations and cross-field rules', () => {
    const fixture = companyFixtures.identification.PA;
    const schema = identificationSchemaFor('PA');

    expect(
      schema.safeParse({ ...fixture, company_email: 'not-an-email' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...fixture, operations_start_date: '2019-01-01' })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...fixture, operations_start_date: '2999-01-01' })
        .success,
    ).toBe(false);
  });

  it('exposes per-country applicability in the registry', () => {
    const field = companyFields.identification.find(
      (item) => item.key === 'identification_expiry_date',
    );

    expect(field?.countries).toEqual(['NI', 'SV']);
  });
});

describe('issueCode', () => {
  it.each([
    [{ code: 'custom', message: 'required' }, 'required'],
    [{ code: 'custom', message: 'not_future' }, 'not_future'],
    [{ code: 'invalid_format', format: 'email' }, 'email'],
    [{ code: 'invalid_format', format: 'url' }, 'url'],
    [{ code: 'invalid_format', format: 'date' }, 'invalid'],
    [{ code: 'invalid_type' }, 'invalid'],
  ])('names %o as %s', (issue, code) => {
    expect(issueCode(issue)).toBe(code);
  });
});
