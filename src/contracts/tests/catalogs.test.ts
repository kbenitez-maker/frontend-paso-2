import type { FieldDefinition } from '../types';

import { describe, expect, it } from 'vitest';

import { buildSectionSchema, issueCode, sectionFields } from '@/contracts';

import {
  catalogCountryOf,
  catalogParentOf,
  isUnlisted,
  rememberCatalog,
  requestFilterOf,
} from '../catalogs';

const codesOf = (
  fields: readonly FieldDefinition[],
  values: Record<string, unknown>,
  country: 'NI' | 'CR' | 'DO' = 'NI',
) => {
  const result = buildSectionSchema(fields, country).safeParse(values);
  return result.success ?
      []
    : result.error.issues.map((issue) => [
        issue.path.join('.'),
        issueCode(issue),
      ]);
};

const base = {
  block: 'identification',
  countries: ['NI', 'CR', 'DO'],
  required: 'when_visible',
} as const satisfies Partial<FieldDefinition>;

describe('catalog parent per country', () => {
  it('reads one key or the key of the country', () => {
    const district = sectionFields('location').find(
      (field) => field.key === 'district_id',
    );

    expect(catalogParentOf(district?.catalog, 'CR')).toBe('canton_id');
    expect(catalogParentOf(district?.catalog, 'SV')).toBe('municipality_id');
    expect(catalogParentOf(district?.catalog, 'PA')).toBe('province_id');
    expect(catalogParentOf(undefined, 'PA')).toBeUndefined();
  });
});

describe('catalog-backed rules', () => {
  const country: FieldDefinition = {
    ...base,
    key: 'country_id',
    type: 'catalog',
    catalog: { name: 'countries', source: 'unknown' },
    validation: [{ not_prohibited: true }],
  };

  it('rejects a country the catalog flags prohibited', () => {
    rememberCatalog('countries', undefined, [
      { code: 'NI' },
      { code: 'KP', prohibited: true },
    ]);

    expect(codesOf([country], { country_id: 'KP' })).toEqual([
      ['country_id', 'prohibited_country'],
    ]);
    expect(codesOf([country], { country_id: 'NI' })).toEqual([]);
  });

  it('stops requiring a hide_when_empty catalog with no rows under its parent', () => {
    const municipality: FieldDefinition = {
      ...base,
      key: 'municipality_id',
      type: 'catalog',
      catalog: { name: 'municipalities', source: 'unknown' },
    };
    const sector: FieldDefinition = {
      ...base,
      key: 'sector_id',
      type: 'catalog',
      catalog: {
        name: 'sectors',
        parent: 'municipality_id',
        hide_when_empty: true,
        source: 'unknown',
      },
    };
    rememberCatalog('sectors', 'empty', []);
    rememberCatalog('sectors', 'full', [{ code: 'full.one' }]);

    expect(
      codesOf([municipality, sector], { municipality_id: 'empty' }, 'DO'),
    ).toEqual([]);
    expect(
      codesOf([municipality, sector], { municipality_id: 'full' }, 'DO'),
    ).toEqual([['sector_id', 'required']]);
  });
});

describe('date and cross-field rules', () => {
  it('rejects a birth date more than 120 years ago', () => {
    const birth: FieldDefinition = {
      ...base,
      key: 'birth_date',
      type: 'date',
      validation: [{ not_future: true }, { max_years_ago: 120 }],
    };

    expect(codesOf([birth], { birth_date: '1890-01-01' })).toEqual([
      ['birth_date', 'max_years_ago'],
    ]);
    expect(codesOf([birth], { birth_date: '1980-01-01' })).toEqual([]);
  });

  it('compares sibling fields inside collection items', () => {
    const item = { ...base, collection: 'people', type: 'date' } as const;
    const fields: FieldDefinition[] = [
      { ...item, key: 'start' },
      { ...item, key: 'end', validation: [{ gte_field: 'start' }] },
    ];

    expect(
      codesOf(fields, {
        people: [
          { start: '2020-01-01', end: '2021-01-01' },
          { start: '2020-01-01', end: '2019-01-01' },
        ],
      }),
    ).toEqual([['people.1.end', 'gte_field']]);
  });
});

describe('catalog country from a sibling', () => {
  const catalog = {
    name: 'departments',
    country_from: 'residence',
    source: 'unknown',
  } as const;

  it('follows a bank country and falls back to the request country', () => {
    expect(catalogCountryOf(catalog, { residence: 'CR' }, 'NI')).toBe('CR');
    expect(catalogCountryOf(catalog, { residence: 'US' }, 'NI')).toBe('NI');
    expect(catalogCountryOf(catalog, {}, 'NI')).toBe('NI');
  });

  it('leaves other catalogs on the bank country', () => {
    expect(
      catalogCountryOf({ name: 'x', source: 'unknown' }, {}, 'NI'),
    ).toBeUndefined();
  });
});

describe('request-scoped catalogs', () => {
  it('flags a designated person the request no longer lists (a broken link)', () => {
    const superusers = sectionFields('superusers');
    const registered = superusers.find(
      (field) => field.key === 'registered_signatory_id',
    );
    const catalog = registered?.catalog ?? { name: 'x', source: 'request' };
    const values = {
      superusers: [
        { assign_registered_signatory: true, registered_signatory_id: 'gone' },
      ],
    };

    // Not read yet: nothing to compare against, the API checks on completion.
    expect(codesOf(superusers, values)).toEqual([]);

    rememberCatalog(catalog.name, requestFilterOf(catalog), [
      { code: 'natural-1' },
    ]);
    expect(isUnlisted(catalog, 'natural-1')).toBe(false);
    expect(isUnlisted(catalog, ['natural-1', 'gone'])).toBe(true);
    expect(codesOf(superusers, values)).toEqual([
      ['superusers.0.registered_signatory_id', 'superuser_unlisted'],
    ]);
  });
});
