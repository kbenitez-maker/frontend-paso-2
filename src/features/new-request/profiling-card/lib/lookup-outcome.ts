import type { CustomerLookup } from '@/server/api';

import { HttpException, StatusCodes } from '@lafise/lde-web-lib';

/** Why the lookup did not let the applicant move on. */
type LookupFailure = 'timeout' | 'unavailable';

type LookupBlock = 'existing_client' | 'request_in_progress' | LookupFailure;

/**
 * Where each block is shown, by what the applicant can do about it: a toast
 * when repeating the action is enough, a notice in the card when there is
 * somewhere to go, a full screen only when the digital channel ends.
 */
type LookupSurface = 'screen' | 'notice' | 'toast';

type LookupResult = { proceed: true } | { proceed: false; block: LookupBlock };

/** Key of the block's copy under `NewRequest.outcomes`. */
type OutcomeKey =
  'existingClient' | 'requestInProgress' | 'timeout' | 'unavailable';

const SURFACES: Readonly<Record<LookupBlock, LookupSurface>> = {
  existing_client: 'screen',
  request_in_progress: 'notice',
  timeout: 'toast',
  unavailable: 'toast',
};

const OUTCOME_KEYS: Readonly<Record<LookupBlock, OutcomeKey>> = {
  existing_client: 'existingClient',
  request_in_progress: 'requestInProgress',
  timeout: 'timeout',
  unavailable: 'unavailable',
};

// eslint-disable-next-line security/detect-object-injection -- key typed by the LookupBlock union
const surfaceOf = (block: LookupBlock): LookupSurface => SURFACES[block];

// eslint-disable-next-line security/detect-object-injection -- key typed by the LookupBlock union
const outcomeKeyOf = (block: LookupBlock): OutcomeKey => OUTCOME_KEYS[block];

/**
 * Only a company that is new to the bank, and whose onboarding store answered,
 * moves on to the base data. An existing client wins over a store that failed.
 */
const resultOfLookup = (lookup: CustomerLookup): LookupResult => {
  if (lookup.company_exists) {
    return { proceed: false, block: 'existing_client' };
  }
  if (lookup.has_active_onboarding_request === true) {
    return { proceed: false, block: 'request_in_progress' };
  }
  if (
    !lookup.onboarding_lookup_available ||
    lookup.has_active_onboarding_request === null
  ) {
    return { proceed: false, block: 'unavailable' };
  }
  return { proceed: true };
};

const GATEWAY_TIMEOUT: number = StatusCodes.GATEWAY_TIMEOUT;

/** Catalog codes the lookup answers with when it cannot return 200. */
const REQUEST_IN_PROGRESS = 'FCJ008';
const LOOKUP_TIMED_OUT = 'FCJ010';

/** Transport codes of an aborted request (the client gives up after the lookup's time limit). */
const ABORT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

/**
 * A failed lookup is never "new to bank". `FCJ008` is a request already open,
 * `FCJ010` (or a client abort, or a gateway 504) invites a retry, and anything
 * else — including `FCJ009` — is a technical error.
 */
const failureOfError = (error: unknown): LookupBlock => {
  if (!(error instanceof HttpException)) return 'unavailable';
  if (error.error.code === REQUEST_IN_PROGRESS) return 'request_in_progress';
  const timedOut =
    error.status === GATEWAY_TIMEOUT ||
    error.error.code === LOOKUP_TIMED_OUT ||
    ABORT_CODES.has(error.error.code);
  return timedOut ? 'timeout' : 'unavailable';
};

export {
  failureOfError,
  outcomeKeyOf,
  resultOfLookup,
  surfaceOf,
  type LookupBlock,
  type LookupResult,
  type LookupSurface,
  type OutcomeKey,
};
