import type { DocumentChecklistItem } from './document-checklist';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/**
 * Where the bank's documents stand. `locked`: the applicant has documents
 * left to upload. `in_review`: the bank is reviewing them. `available`: the
 * documents are published to download, sign and return. `returned`: the bank
 * sent some back (only those are listed, each with its reason).
 */
type BankDocumentsPhase = 'locked' | 'in_review' | 'available' | 'returned';

/** Documents the bank generates for the applicant to sign and upload back. */
interface BankDocuments {
  phase: BankDocumentsPhase;
  /** Empty until the bank publishes them. */
  items: DocumentChecklistItem[];
}

const bankDocumentsQuery = (requestId: string) =>
  queryAdapter.query<BankDocuments>({
    queryKey: queryKeys.accountRequests.bankDocuments(requestId),
    url: endpoints.accountRequests.bankDocuments(requestId),
    options: { apiVersion: APIVersion.V1 },
  });

export { bankDocumentsQuery, type BankDocuments, type BankDocumentsPhase };
