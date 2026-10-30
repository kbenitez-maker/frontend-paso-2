import type { ExchangeRate } from '@/server/api';

import { reportClientFailure } from '@/lib/report-client-failure';

/**
 * Local equivalent of the dollar amount, or nothing when the bank already
 * uses dollars or the quote did not convert an amount.
 */
const equivalentOf = (
  quote: ExchangeRate,
  locale: string,
): string | undefined => {
  if (quote.base_currency === 'USD' || quote.conversion === null) {
    return undefined;
  }

  const { local_amount: localAmount } = quote.conversion;
  if (!Number.isFinite(localAmount)) return undefined;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: quote.base_currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(localAmount);
  } catch {
    reportClientFailure({ message: 'currency format failed' });
    return undefined;
  }
};

export { equivalentOf };
