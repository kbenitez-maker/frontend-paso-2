import type { StepSlug } from '@/lib/constants/steps';
import type { ApiError } from '@/types/api-error';
import type { BankId, CountryCode, PersonType } from '@/types/domain';
import type { Page } from '@/types/page';
import type { RequestStatus, SectionKey, SectionState } from '@/types/request';
import type { ReclassificationTrace } from './reclassifications';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { Http } from '@/lib/http';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

interface AccountRequestBase {
  request_id: string;
  bank_id: BankId;
  status: RequestStatus;
  legal_name: string | null;
  created_at: string;
  updated_at: string;
}

/** One row of the request list. */
interface AccountRequestSummary {
  request_id: string;
  /** Human-facing reference, e.g. `SOL-0001`. */
  request_number: string;
  bank_id: BankId;
  country: CountryCode;
  company_name: string | null;
  company_tax_id: string | null;
  status: RequestStatus;
  /** `false` once the request left the applicant's hands (submitted, in review, opened). */
  editable: boolean;
  /** Step to resume at; `null` when the request cannot be resumed. */
  resume_step: StepSlug | null;
  progress_percent: number;
  /** Form steps whose state is `complete` (the "1" of "1/7 de pasos"). */
  completed_steps: number;
  total_steps: number;
  /** Bank milestones reached once submitted (the "1" of "1/3 hitos"). */
  completed_milestones: number;
  total_milestones: number;
  created_at: string;
  updated_at: string;
}

/** Query params of the request list; `page` is 1-based. */
interface AccountRequestsListParams {
  status?: RequestStatus;
  bank_id?: BankId;
  page?: number;
  page_size?: number;
}

interface ProfileData {
  person_type: PersonType;
  country: CountryCode;
}

interface AccountRequest extends AccountRequestBase {
  /** Human-facing reference, e.g. `SOL-0001`. */
  request_number: string;
  profile: ProfileData | null;
  sections: Partial<Record<SectionKey, SectionState>>;
}

/** Section payload wrapped with its completion state. */
interface SectionEnvelope<T> {
  section_key: SectionKey;
  state: SectionState;
  data: T;
}

/** `draft` accepts partial data; `complete` also requires every visible required field. */
type SaveMode = 'draft' | 'complete';

type StepState = 'not_started' | 'in_progress' | 'complete';

/**
 * Filled versus applicable fields of one step block (`STEPS` block key). Document
 * checklist blocks count documents or steps instead: `unit` says which (fields when absent).
 */
interface BlockProgress {
  key: string;
  completed_fields: number;
  total_fields: number;
  unit?: 'documents' | 'steps';
  /** Listed but closed until an earlier block is done (the checklist waits for the confirmation). */
  waiting?: boolean;
}

interface StepProgress {
  slug: StepSlug;
  state: StepState;
  blocks: BlockProgress[];
}

/** Completion of the whole request, one entry per form step in `STEPS` order. */
interface RequestProgress {
  percent: number;
  steps: StepProgress[];
}

/**
 * Profiling data of a legal person that passed the customer lookup. The bank
 * comes from the path; the request's country follows from it.
 */
interface CreateAccountRequestBody {
  /** Code of the `identification-types` catalog row. */
  identification_type_id: string;
  identification_number: string;
  legal_name: string;
  /** Code of the `legal-entity-types` catalog row. */
  legal_entity_type_id: string;
  /** Approximate sales of the last closed year, in USD. */
  annual_sales_usd: number;
  /** Code of the `branches` catalog row. */
  branch_id: string;
}

/**
 * Detail of a request: the stored request plus what the API derives for it.
 * `profiling` holds the current profiling answers (those preloaded into the
 * form follow its later saves); `null` for a request without profiling.
 */
interface AccountRequestDetail extends AccountRequest {
  /** `false` once the request left the applicant's hands (submitted, in review, opened). */
  editable: boolean;
  profiling: CreateAccountRequestBody | null;
  /** The last legal entity type change that affected the related parties; `null` when none did. */
  reclassification: ReclassificationTrace | null;
}

/**
 * Profiling answers the applicant may change once the request exists. The
 * identification is fixed, and the legal entity type changes only through a
 * reclassification (`reclassifications.ts`).
 */
type UpdateProfilingBody = Partial<
  Pick<
    CreateAccountRequestBody,
    'legal_name' | 'annual_sales_usd' | 'branch_id'
  >
>;

const accountRequestsListQuery = (params: AccountRequestsListParams = {}) => {
  const query: Record<string, string> = Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

  return queryAdapter.query<Page<AccountRequestSummary>>({
    queryKey: queryKeys.accountRequests.list(query),
    url: endpoints.accountRequests.list(),
    options: { apiVersion: APIVersion.V1, params: query },
  });
};

const accountRequestQuery = (requestId: string) =>
  queryAdapter.query<AccountRequestDetail>({
    queryKey: queryKeys.accountRequests.detail(requestId),
    url: endpoints.accountRequests.detail(requestId),
    options: { apiVersion: APIVersion.V1 },
  });

const requestProgressQuery = (requestId: string) =>
  queryAdapter.query<RequestProgress>({
    queryKey: queryKeys.accountRequests.progress(requestId),
    url: endpoints.accountRequests.progress(requestId),
    options: { apiVersion: APIVersion.V1 },
  });

const sectionQuery = <T>(requestId: string, sectionKey: SectionKey) =>
  queryAdapter.query<SectionEnvelope<T>>({
    queryKey: queryKeys.accountRequests.section(requestId, sectionKey),
    url: endpoints.accountRequests.section(requestId, sectionKey),
    options: { apiVersion: APIVersion.V1 },
  });

/** Replaces one section with `T`; the server answers with the stored envelope. */
const sectionMutation = <T>(
  requestId: string,
  sectionKey: SectionKey,
  mode: SaveMode,
) =>
  queryAdapter.mutation<SectionEnvelope<T>, T>({
    url: endpoints.accountRequests.section(requestId, sectionKey),
    method: 'put',
    options: { apiVersion: APIVersion.V1, params: { mode } },
  });

/**
 * 422 body of a submission while steps are missing; `incomplete_steps` lists
 * them in `STEPS` order (the signature counts the signed bank documents).
 */
interface IncompleteRequestError extends ApiError {
  code: 'REQUEST_INCOMPLETE';
  incomplete_steps: StepSlug[];
}

/**
 * Hands the request to the bank ("Finalizar" of the signature step). The
 * server answers with the request, now `submitted`; 409 when it is no longer
 * editable, 422 (`IncompleteRequestError`) while a step is incomplete.
 */
const submitAccountRequestMutation = (requestId: string) =>
  queryAdapter.mutation<AccountRequest, undefined>({
    url: endpoints.accountRequests.submissions(requestId),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

/** Saves the changed profiling answers; the server answers with the updated detail. */
const updateProfilingMutation = (requestId: string) =>
  queryAdapter.mutation<AccountRequestDetail, UpdateProfilingBody>({
    url: endpoints.accountRequests.profiling(requestId),
    method: 'patch',
    options: { apiVersion: APIVersion.V1 },
  });

/** Server-side read (Server Components); the browser uses `accountRequestQuery`. */
const getAccountRequest = (requestId: string, accessToken: string | null) =>
  Http.get<AccountRequestDetail>(endpoints.accountRequests.detail(requestId), {
    apiVersion: APIVersion.V1,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

/** Server-side read (Server Components); the browser uses `requestProgressQuery`. */
const getRequestProgress = (requestId: string, accessToken: string | null) =>
  Http.get<RequestProgress>(endpoints.accountRequests.progress(requestId), {
    apiVersion: APIVersion.V1,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

export {
  accountRequestQuery,
  accountRequestsListQuery,
  getAccountRequest,
  getRequestProgress,
  requestProgressQuery,
  sectionMutation,
  sectionQuery,
  submitAccountRequestMutation,
  updateProfilingMutation,
  type AccountRequest,
  type AccountRequestDetail,
  type AccountRequestsListParams,
  type AccountRequestSummary,
  type BlockProgress,
  type CreateAccountRequestBody,
  type IncompleteRequestError,
  type ProfileData,
  type RequestProgress,
  type SaveMode,
  type SectionEnvelope,
  type StepProgress,
  type StepState,
  type UpdateProfilingBody,
};
