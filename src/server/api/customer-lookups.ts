import type { BankId } from '@/types/domain';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/**
 * What Intranet and the onboarding store reported for one identification.
 * `has_active_onboarding_request` is null when that store could not be read.
 */
interface CustomerLookup {
  company_exists: boolean;
  has_active_onboarding_request: boolean | null;
  onboarding_lookup_available: boolean;
}

const isNullableBoolean = (value: unknown): value is boolean | null =>
  value === null || typeof value === 'boolean';

/** Narrows a response body to the lookup the bank actually returns. */
const isCustomerLookup = (value: unknown): value is CustomerLookup =>
  typeof value === 'object' &&
  value !== null &&
  'company_exists' in value &&
  typeof value.company_exists === 'boolean' &&
  'has_active_onboarding_request' in value &&
  isNullableBoolean(value.has_active_onboarding_request) &&
  'onboarding_lookup_available' in value &&
  typeof value.onboarding_lookup_available === 'boolean';

/**
 * The lookup must answer within this time; a slower answer is an error, never
 * "new to bank".
 */
const LOOKUP_TIMEOUT_MS = 10_000;

const customerLookupQuery = (bankId: BankId, identification: string) =>
  queryAdapter.query<CustomerLookup>({
    queryKey: queryKeys.customerLookups.get(bankId, identification),
    url: endpoints.customerLookups.get(bankId),
    options: {
      apiVersion: APIVersion.V1,
      timeout: LOOKUP_TIMEOUT_MS,
      params: { IDENTIFICATION: identification },
    },
  });

export {
  customerLookupQuery,
  isCustomerLookup,
  LOOKUP_TIMEOUT_MS,
  type CustomerLookup,
};
