import type { StepSlug } from '@/lib/constants/steps';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';
import { isRequestId } from '@/lib/request-id';

import { endpoints } from './endpoints';

/**
 * Body of `POST account-opening-requests`. The bank is a field, not a path
 * segment. Codes are catalog codes. `annual_sales_usd` may be zero; omitting
 * it is rejected by the API.
 */
interface CreateAccountOpeningRequestBody {
  bank_id: string;
  legal_name: string;
  identification_number: string;
  identification_type_code?: string;
  entity_type_code: string;
  annual_sales_usd: number;
  branch_code: string;
}

/** Draft the API returns with 201. Later steps use `request_id`. */
interface AccountOpeningRequestCreated {
  request_id: string;
  form_version_id: number;
  operating_country_id: number;
  bank_id: string;
  legal_name: string;
  identification_number: string;
  status_code: string;
  status: string;
  can_edit: boolean;
  entity_type_code: string;
  annual_sales_usd: number;
  branch_code: string;
}

/**
 * The next step only needs the draft id. A 201 that carries it is the draft;
 * rejecting the rest of the body would invite a second create.
 */
const isAccountOpeningRequestCreated = (
  value: unknown,
): value is Pick<AccountOpeningRequestCreated, 'request_id'> =>
  typeof value === 'object' &&
  value !== null &&
  'request_id' in value &&
  isRequestId(value.request_id);

const createAccountOpeningRequestMutation = () =>
  queryAdapter.mutation<
    AccountOpeningRequestCreated,
    CreateAccountOpeningRequestBody
  >({
    url: endpoints.accountOpeningRequests.create(),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

type OpeningFieldVisibilityRule =
  | { readonly all: readonly OpeningFieldVisibilityRule[] }
  | { field: string; equals: string | number | boolean }
  | { field: string; codeEquals: string }
  | { field: string; codeNotEquals: string }
  | { field: string; hasValue: true };

interface OpeningFieldValidationRules {
  maxLength?: number;
  maxDate?: string;
  minDateField?: string;
  requiredWhen?: OpeningFieldVisibilityRule;
}

/** One field of `GET account-opening-requests/{id}/sections`. */
interface OpeningSectionField {
  code: string;
  display_name: string;
  field_type: string;
  value_kind?: string;
  is_required?: boolean;
  display_order: number;
  placeholder?: string;
  help_text?: string;
  catalog_code?: string;
  validation_rules?: OpeningFieldValidationRules;
  visibility_rule?: OpeningFieldVisibilityRule | null;
  children?: OpeningSectionField[];
}

interface OpeningSectionSummary {
  code: string;
  display_name: string;
  display_order: number;
}

interface OpeningStepSummary {
  code: string;
  display_name: string;
  display_order: number;
  sections: OpeningSectionSummary[];
}

interface OpeningCurrentSection {
  step_code: string;
  section_code: string;
  display_name: string;
  display_order: number;
  fields: OpeningSectionField[];
  values: Record<string, unknown>;
}

/** Body of `GET account-opening-requests/{id}/sections?step_code=`. */
interface AccountOpeningSections {
  form_version_id: number;
  current_step_code: string;
  current_section_code: string;
  steps: OpeningStepSummary[];
  current_section: OpeningCurrentSection;
}

const withPreviewBank = (key: readonly unknown[], bank?: string) =>
  bank === undefined || bank === '' ? [...key] : [...key, bank];

const accountOpeningSectionsQuery = (
  requestId: string,
  stepCode: StepSlug,
  sectionCode?: string,
  bank?: string,
) =>
  queryAdapter.query<AccountOpeningSections>({
    queryKey: withPreviewBank(
      queryKeys.accountOpeningRequests.sections(
        requestId,
        stepCode,
        sectionCode,
      ),
      bank,
    ),
    url: endpoints.accountOpeningRequests.sections(requestId),
    options: {
      apiVersion: APIVersion.V1,
      params: {
        step_code: stepCode,
        ...(sectionCode === undefined ? {} : { section_code: sectionCode }),
      },
    },
  });

/**
 * Saved answer of one step. Each section's answers live under its section
 * code (`payload.identification.legal_name`).
 */
interface AccountOpeningStepAnswer {
  step_slug: string;
  form_step_id: number;
  form_version_id: number;
  /** Absent on the `{}` the API returns before the first save. */
  payload?: Record<string, unknown>;
  /** Absent on the `{}` the API returns before the first save. */
  completed_at?: string | null;
}

/** Body of `PUT …/steps/{stepCode}/answer`; it replaces the whole payload. */
interface UpsertAccountOpeningStepAnswerBody {
  payload: Record<string, unknown>;
  completed_at: string | null;
}

const accountOpeningStepAnswerQuery = (
  requestId: string,
  stepCode: StepSlug,
  bank?: string,
) =>
  queryAdapter.query<AccountOpeningStepAnswer>({
    queryKey: withPreviewBank(
      queryKeys.accountOpeningRequests.stepAnswer(requestId, stepCode),
      bank,
    ),
    url: endpoints.accountOpeningRequests.stepAnswer(requestId, stepCode),
    options: { apiVersion: APIVersion.V1 },
  });

const upsertAccountOpeningStepAnswerMutation = (
  requestId: string,
  stepCode: StepSlug,
) =>
  queryAdapter.mutation<
    AccountOpeningStepAnswer,
    UpsertAccountOpeningStepAnswerBody
  >({
    url: endpoints.accountOpeningRequests.stepAnswer(requestId, stepCode),
    method: 'put',
    options: { apiVersion: APIVersion.V1 },
  });

export {
  accountOpeningSectionsQuery,
  accountOpeningStepAnswerQuery,
  createAccountOpeningRequestMutation,
  isAccountOpeningRequestCreated,
  upsertAccountOpeningStepAnswerMutation,
  type AccountOpeningRequestCreated,
  type AccountOpeningSections,
  type AccountOpeningStepAnswer,
  type CreateAccountOpeningRequestBody,
  type OpeningCurrentSection,
  type OpeningFieldVisibilityRule,
  type OpeningSectionField,
  type OpeningSectionSummary,
  type UpsertAccountOpeningStepAnswerBody,
};
