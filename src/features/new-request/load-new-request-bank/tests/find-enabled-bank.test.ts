import type { BankDto } from '@/server/api';

import { describe, expect, it } from 'vitest';

import { findEnabledBank } from '../lib/find-enabled-bank';

const nicaragua: BankDto = {
  bank_id: 'BLNI',
  country: 'NI',
  name: 'Nicaragua',
  legal_name: 'Banco LAFISE BANCENTRO, S.A.',
  enabled: true,
};

const banks: BankDto[] = [
  nicaragua,
  {
    bank_id: 'BLPA',
    country: 'PA',
    name: 'Panamá',
    legal_name: 'Banco LAFISE Panamá, S.A.',
    enabled: false,
  },
];

describe('findEnabledBank', () => {
  it('returns the bank for a valid, enabled id', () => {
    expect(findEnabledBank('BLNI', banks)).toEqual(nicaragua);
  });

  it('maps the alpha-3 country the API returns to the zone country code', () => {
    const fromApi = [{ ...nicaragua, country: 'NIC' }];

    expect(findEnabledBank('BLNI', fromApi)?.country).toBe('NI');
  });

  it('rejects a bank whose country the zone does not support', () => {
    const fromApi = [{ ...nicaragua, country: 'GTM' }];

    expect(findEnabledBank('BLNI', fromApi)).toBeNull();
  });

  it.each([undefined, 'XX', ['BLNI'], 'blni'])(
    'rejects an invalid param (%s)',
    (param) => {
      expect(findEnabledBank(param, banks)).toBeNull();
    },
  );

  it('rejects a disabled bank', () => {
    expect(findEnabledBank('BLPA', banks)).toBeNull();
  });

  it('rejects a valid id the API does not list', () => {
    expect(findEnabledBank('BLCR', banks)).toBeNull();
  });
});
