import type { BankId } from '@/types/domain';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

interface CurrencyRate {
  currency: string;
  buying: number;
  selling: number;
  official: number;
}

interface ExchangeConversion {
  amount_usd: number;
  rate_type: string;
  rate: number;
  local_amount: number;
}

/**
 * USD quote for a bank. `conversion` is present only when the read included
 * `AMOUNT`; the local figure is that amount times the buying rate.
 */
interface ExchangeRate {
  base_currency: string;
  rate_date: string;
  rates: CurrencyRate[];
  conversion: ExchangeConversion | null;
}

const ISO_CURRENCY = /^[A-Z]{3}$/;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isCurrencyRate = (value: unknown): value is CurrencyRate =>
  typeof value === 'object' &&
  value !== null &&
  'currency' in value &&
  typeof value.currency === 'string' &&
  'buying' in value &&
  isFiniteNumber(value.buying) &&
  'selling' in value &&
  isFiniteNumber(value.selling) &&
  'official' in value &&
  isFiniteNumber(value.official);

const isConversion = (value: unknown): value is ExchangeConversion =>
  typeof value === 'object' &&
  value !== null &&
  'amount_usd' in value &&
  isFiniteNumber(value.amount_usd) &&
  'rate_type' in value &&
  typeof value.rate_type === 'string' &&
  'rate' in value &&
  isFiniteNumber(value.rate) &&
  'local_amount' in value &&
  isFiniteNumber(value.local_amount);

/** Narrows a response body to the quote the bank actually returns. */
const isExchangeRate = (value: unknown): value is ExchangeRate =>
  typeof value === 'object' &&
  value !== null &&
  'base_currency' in value &&
  typeof value.base_currency === 'string' &&
  ISO_CURRENCY.test(value.base_currency) &&
  'rate_date' in value &&
  typeof value.rate_date === 'string' &&
  'rates' in value &&
  Array.isArray(value.rates) &&
  value.rates.every(isCurrencyRate) &&
  'conversion' in value &&
  (value.conversion === null || isConversion(value.conversion));

const exchangeRateQuery = (bankId: BankId, amountUsd: number) =>
  queryAdapter.query<ExchangeRate>({
    queryKey: queryKeys.exchangeRates.get(bankId, amountUsd),
    url: endpoints.exchangeRates.get(bankId),
    options: {
      apiVersion: APIVersion.V1,
      params: { AMOUNT: String(amountUsd) },
    },
  });

export { exchangeRateQuery, isExchangeRate, type ExchangeRate };
