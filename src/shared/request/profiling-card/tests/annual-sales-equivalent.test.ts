import { describe, expect, it, vi } from 'vitest';

import { equivalentOf } from '../lib/annual-sales-equivalent';

const quote = (baseCurrency: string, localAmount: number | null) => ({
  base_currency: baseCurrency,
  rate_date: '2026-10-14',
  rates: [{ currency: 'USD', buying: 36.45, selling: 37.5, official: 36.6243 }],
  conversion:
    localAmount === null ? null : (
      {
        amount_usd: 1000,
        rate_type: 'buying',
        rate: 36.45,
        local_amount: localAmount,
      }
    ),
});

describe('equivalentOf', () => {
  it('formats the local amount when the bank does not already use dollars', () => {
    const label = equivalentOf(quote('NIO', 36450), 'es');

    expect(label).toEqual(expect.any(String));
    expect(label).toContain('36');
    expect(label).toMatch(/NIO|C\$/);
  });

  it('stays quiet when the base is already USD or there is no conversion', () => {
    expect(equivalentOf(quote('USD', 1000), 'es')).toBeUndefined();
    expect(equivalentOf(quote('NIO', null), 'es')).toBeUndefined();
  });

  it('stays quiet when the local amount is not finite', () => {
    expect(equivalentOf(quote('NIO', Number.NaN), 'es')).toBeUndefined();
  });

  it('stays quiet when the currency cannot be formatted', () => {
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(equivalentOf(quote('NOT_CURRENCY', 10), 'es')).toBeUndefined();
    expect(errorLog).toHaveBeenCalledWith('currency format failed', {});

    errorLog.mockRestore();
  });
});
