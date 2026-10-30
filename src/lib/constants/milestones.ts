import type { RequestStatus } from '@/types/request';

/**
 * Bank milestones once the request is submitted (POC `HITOS_DEL_BANCO`):
 * registration and documents, internal review with the bank documents
 * generated, account opening and Bancanet activation.
 */
const TOTAL_MILESTONES = 3;

/** Milestones reached per status (POC `hitosCumplidos`); none while the applicant owns it or once it is lost. */
const MILESTONES_BY_STATUS: Readonly<Record<RequestStatus, number>> = {
  draft: 0,
  returned_to_client: 0,
  submitted: 1,
  in_review: 1,
  paused_compliance: 1,
  bank_documents_generated: 2,
  approved: 3,
  account_opened: 3,
  rejected: 0,
  cancelled: 0,
};

export { MILESTONES_BY_STATUS, TOTAL_MILESTONES };
