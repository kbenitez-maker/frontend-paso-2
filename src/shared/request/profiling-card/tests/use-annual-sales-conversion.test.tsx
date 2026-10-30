import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NextIntlClientTestWrapper } from '@/test/next-intl';

const quoteSpy = vi.hoisted(() =>
  vi.fn<(bankId: string, amount: number) => Promise<unknown>>(),
);

vi.mock('@/server/api', async () => {
  const actual = await vi.importActual<{
    isExchangeRate: (value: unknown) => boolean;
  }>('@/server/api');

  return {
    exchangeRateQuery: (bankId: string, amount: number) => ({
      queryKey: ['exchange-rates', bankId, amount],
      queryFn: () => quoteSpy(bankId, amount),
    }),
    isExchangeRate: actual.isExchangeRate,
  };
});

const { useAnnualSalesConversion } =
  await import('../use-annual-sales-conversion');

const quote = (baseCurrency: string, localAmount: number | null = 36_450) => ({
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

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientTestWrapper>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientTestWrapper>
  );

  return Wrapper;
};

const localAmount = (value: number): string =>
  new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'NIO',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

describe('useAnnualSalesConversion', () => {
  beforeEach(() => {
    quoteSpy.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('quotes once after the applicant pauses', async () => {
    vi.useFakeTimers();
    quoteSpy.mockResolvedValue(quote('NIO'));
    const initialAmount: { amount: number | undefined } = { amount: undefined };
    const { rerender } = renderHook(
      ({ amount }: { amount: number | undefined }) =>
        useAnnualSalesConversion('BLNI', amount),
      { wrapper: createWrapper(), initialProps: initialAmount },
    );

    rerender({ amount: 1 });
    rerender({ amount: 10 });
    rerender({ amount: 100 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(quoteSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(quoteSpy).toHaveBeenCalledTimes(1);
    expect(quoteSpy).toHaveBeenCalledWith('BLNI', 100);
  });

  it('shows the formatted local amount once the quote answers', async () => {
    quoteSpy.mockResolvedValue(quote('NIO', 36_450));
    const { result } = renderHook(
      () => useAnnualSalesConversion('BLNI', 1000),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current).toBe(localAmount(36_450));
    });
  });

  it.each([undefined, 0])('does not quote %s', async (amount) => {
    vi.useFakeTimers();
    quoteSpy.mockResolvedValue(quote('NIO'));
    renderHook(() => useAnnualSalesConversion('BLNI', amount), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(quoteSpy).not.toHaveBeenCalled();
  });

  it('hides the equivalent when the bank already uses dollars', async () => {
    vi.useFakeTimers();
    quoteSpy.mockResolvedValue(quote('USD', 1000));
    const { result } = renderHook(
      () => useAnnualSalesConversion('BLNI', 1000),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(quoteSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBeUndefined();
  });

  it('returns nothing when the quote fails', async () => {
    vi.useFakeTimers();
    quoteSpy.mockRejectedValue(new Error('500'));
    const { result } = renderHook(
      () => useAnnualSalesConversion('BLNI', 1000),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(quoteSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBeUndefined();
  });

  it('returns nothing when the quote is not a rate', async () => {
    vi.useFakeTimers();
    quoteSpy.mockResolvedValue({ base_currency: 'NOT_CURRENCY' });
    const { result } = renderHook(
      () => useAnnualSalesConversion('BLNI', 1000),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(quoteSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBeUndefined();
  });
});
