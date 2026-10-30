const REQUEST_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'bank_documents_generated',
  'returned_to_client',
  'paused_compliance',
  'approved',
  'account_opened',
  'rejected',
  'cancelled',
] as const;

type RequestStatus = (typeof REQUEST_STATUSES)[number];

const REQUEST_STATUS_VALUES: readonly unknown[] = REQUEST_STATUSES;

const isRequestStatus = (value: unknown): value is RequestStatus =>
  REQUEST_STATUS_VALUES.includes(value);

type SectionState = 'empty' | 'in_progress' | 'complete' | 'returned';

/**
 * Document checklist stages: `base` is asked before the form (profiling),
 * `checklist` closes the form. The bank's own documents are a separate resource.
 */
const DOCUMENT_STAGES = ['base', 'checklist'] as const;

type DocumentStage = (typeof DOCUMENT_STAGES)[number];

const DOCUMENT_STAGE_VALUES: readonly unknown[] = DOCUMENT_STAGES;

const isDocumentStage = (value: unknown): value is DocumentStage =>
  DOCUMENT_STAGE_VALUES.includes(value);

/** Declarations the applicant accepts one by one before the request is handed to the bank. */
const STATEMENT_KEYS = [
  'data-validated',
  'declaration',
  'no-commitment',
] as const;

type StatementKey = (typeof STATEMENT_KEYS)[number];

const STATEMENT_KEY_VALUES: readonly unknown[] = STATEMENT_KEYS;

const isStatementKey = (value: unknown): value is StatementKey =>
  STATEMENT_KEY_VALUES.includes(value);

export type { SectionKey } from '@/contracts/steps';

export {
  DOCUMENT_STAGES,
  isDocumentStage,
  isRequestStatus,
  isStatementKey,
  REQUEST_STATUSES,
  STATEMENT_KEYS,
  type DocumentStage,
  type RequestStatus,
  type SectionState,
  type StatementKey,
};
