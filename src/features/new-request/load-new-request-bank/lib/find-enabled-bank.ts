import type { Bank, BankDto } from '@/server/api';

import { isBankId, toCountryCode } from '@/types/domain';

/**
 * Resolves the `?bank=` search param to an enabled bank. `null` when the param
 * is missing, repeated, not a bank id, unknown to the API, disabled or in a
 * country the zone does not support.
 */
const findEnabledBank = (
  param: unknown,
  banks: readonly BankDto[],
): Bank | null => {
  if (!isBankId(param)) return null;

  const bank = banks.find(
    (candidate) => candidate.bank_id === param && candidate.enabled,
  );
  const country = bank && toCountryCode(bank.country);

  return bank && country ? { ...bank, country } : null;
};

export { findEnabledBank };
