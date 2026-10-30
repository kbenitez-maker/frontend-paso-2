import type { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { partiesOf } from '@/lib/ownership';
import { NextIntlClientTestWrapper } from '@/test/next-intl';
import { es } from '@/test/render';

import { useCompanyOptions } from '../use-company-options';

type Item = Record<string, unknown>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientTestWrapper>{children}</NextIntlClientTestWrapper>
);

const option = es.RelatedParties.ownership.option;

const company = (number: string, name: string, parent: string): Item => ({
  shareholder_person_type_id: 'legal',
  shareholder_identification_type_id: 'ruc',
  shareholder_identification_number: number,
  shareholder_legal_name: name,
  shareholder_parent_company_id: parent,
});

const optionsOf = (items: Item[]) => {
  const parties = partiesOf(items);
  const labels = new Map(parties.map((party) => [party.id, party.name]));
  const { result } = renderHook(
    () => useCompanyOptions({ values: {}, items, parties, labels }),
    { wrapper },
  );
  return result.current;
};

describe('useCompanyOptions', () => {
  it('answers only the companies catalog, and nothing for any other', () => {
    const optionsFor = optionsOf([]);

    expect(optionsFor('countries', undefined)).toBeUndefined();
    expect(optionsFor('shareholder-administrators', undefined)).toEqual([]);
  });

  it('offers the holder as untouched while nobody holds its capital', () => {
    const [holder] = optionsOf([])('shareholding-companies', undefined) ?? [];

    expect(holder?.code).toBe('holder');
    expect(holder?.name).toContain(option.untouched);
  });

  it('shows what is left of the holder and of each company with its level', () => {
    const items = [
      { ...company('1', 'Acme', 'holder'), shareholder_share_percentage: 60 },
      {
        ...company('2', 'Beta', 'ruc|1'),
        shareholder_share_percentage: 25,
      },
    ];

    const options = optionsOf(items)('shareholding-companies', undefined) ?? [];

    expect(options.map(({ name }) => name)).toEqual([
      `La empresa titular · queda 40.00 %`,
      'Nivel 1 · Acme · queda 75.00 %',
      'Nivel 2 · Beta · sin accionistas todavía',
    ]);
  });

  it('hides a completed holder and company unless it is the current choice', () => {
    const items = [
      { ...company('1', 'Acme', 'holder'), shareholder_share_percentage: 100 },
      {
        ...company('2', 'Beta', 'ruc|1'),
        shareholder_share_percentage: 100,
      },
      {
        ...company('3', 'Gamma', 'ruc|2'),
        shareholder_share_percentage: 100,
      },
    ];
    const optionsFor = optionsOf(items);

    // Only Gamma, with its capital untouched, still takes shareholders.
    expect(
      optionsFor('shareholding-companies', undefined)?.map(({ code }) => code),
    ).toEqual(['ruc|3']);

    const kept = optionsFor('shareholding-companies', 'holder') ?? [];
    expect(kept[0]?.name).toBe(`La empresa titular · ${option.complete}`);
    expect(
      optionsFor('shareholding-companies', 'ruc|1')?.map(({ code }) => code),
    ).toEqual(['ruc|1', 'ruc|3']);
  });

  it('leaves listed companies and natural persons out', () => {
    const items = [
      {
        ...company('1', 'Listed', 'holder'),
        shareholder_is_listed: true,
        shareholder_share_percentage: 50,
      },
      {
        shareholder_person_type_id: 'natural',
        shareholder_first_name: 'Ana',
        shareholder_parent_company_id: 'holder',
        shareholder_share_percentage: 50,
      },
    ];

    const codes = optionsOf(items)('shareholding-companies', 'holder')?.map(
      ({ code }) => code,
    );

    expect(codes).toEqual(['holder']);
  });
});
