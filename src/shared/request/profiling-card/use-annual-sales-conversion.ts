'use client';

import { useEffect, useState } from 'react';

import type { BankId } from '@/types/domain';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { exchangeRateQuery, isExchangeRate } from '@/server/api';

import { equivalentOf } from './lib/annual-sales-equivalent';

/** Wait until the applicant pauses, so each keystroke is not a quote. */
const DEBOUNCE_MS = 400;

const useDebouncedAmount = (amount: number | undefined): number | undefined => {
  const [debounced, setDebounced] = useState(amount);

  // A timer is an external system: the effect only schedules and clears it.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(amount);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [amount]);

  return debounced;
};

/**
 * Local equivalent of the annual sales, once the buying rate answers.
 * A missing or failed quote leaves the field's own hint in place.
 */
const useAnnualSalesConversion = (
  bankId: BankId,
  amountUsd: number | undefined,
): string | undefined => {
  const locale = useLocale();
  const amount = useDebouncedAmount(amountUsd);
  const ready = amount !== undefined && amount > 0;
  const quote = useQuery({
    ...exchangeRateQuery(bankId, amount ?? 0),
    enabled: ready,
    retry: false,
    throwOnError: false,
  });

  if (!ready || !isExchangeRate(quote.data)) return undefined;
  return equivalentOf(quote.data, locale);
};

export { useAnnualSalesConversion };
