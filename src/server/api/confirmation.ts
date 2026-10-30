import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { StatementKey } from '@/types/request';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/** Where an answer was captured: the profiling, or a block of a form step. */
type ConfirmationSource =
  'profile' | { step: StepSlug; block: BlockOf<StepSlug> };

/** Rows of the review; the zone looks the label of each up by its key. */
type ConfirmationKey =
  | 'legal_entity_type'
  | 'incorporation_country'
  | 'business_activity'
  | 'economic_sector'
  | 'economic_activity'
  | 'registered_in_rtbf'
  | 'law_7786_category'
  | 'other_tax_residence'
  | 'free_trade_zone'
  | 'fintech'
  | 'statutes_grant_bank_powers'
  | 'regulated_by_government_body'
  | 'special_regime_zone';

/** One captured answer, shown read-only; `null` while it has no answer. */
interface ConfirmationField {
  key: ConfirmationKey;
  /** Booleans and catalog rows arrive resolved: a flag or the row's name. */
  value: string | boolean | null;
  source: ConfirmationSource;
}

/** A legal representative the applicant may designate to sign the bank documents. */
interface SignerOption {
  id: string;
  name: string;
}

interface ConfirmationChoices {
  signer_id: string | null;
  accepted_statements: StatementKey[];
}

/** Review of the request before the documents: echo of the answers plus the applicant's choices. */
interface Confirmation extends ConfirmationChoices {
  fields: ConfirmationField[];
  signer_options: SignerOption[];
}

const confirmationQuery = (requestId: string) =>
  queryAdapter.query<Confirmation>({
    queryKey: queryKeys.accountRequests.confirmation(requestId),
    url: endpoints.accountRequests.confirmation(requestId),
    options: { apiVersion: APIVersion.V1 },
  });

/** Replaces the signer and the accepted statements; the server answers with the stored review. */
const saveConfirmationMutation = (requestId: string) =>
  queryAdapter.mutation<Confirmation, ConfirmationChoices>({
    url: endpoints.accountRequests.confirmation(requestId),
    method: 'put',
    options: { apiVersion: APIVersion.V1 },
  });

export {
  confirmationQuery,
  saveConfirmationMutation,
  type Confirmation,
  type ConfirmationChoices,
  type ConfirmationField,
  type ConfirmationKey,
  type ConfirmationSource,
  type SignerOption,
};
