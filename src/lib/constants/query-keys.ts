import type { StepSlug } from '@/lib/constants/steps';
import type { BankId, CatalogName } from '@/types/domain';
import type { DocumentStage, SectionKey } from '@/types/request';

const queryKeys = {
  users: {
    me: () => ['users', 'me'] as const,
  },
  banks: {
    list: () => ['banks', 'list'] as const,
  },
  accountRequests: {
    list: (params: Record<string, string | undefined> = {}) =>
      ['account-requests', 'list', params] as const,
    detail: (requestId: string) => ['account-requests', requestId] as const,
    progress: (requestId: string) =>
      ['account-requests', requestId, 'progress'] as const,
    fieldChecklist: (requestId: string, step: StepSlug) =>
      ['account-requests', requestId, 'field-checklist', step] as const,
    section: (requestId: string, sectionKey: SectionKey) =>
      ['account-requests', requestId, 'sections', sectionKey] as const,
    /** Prefix of every document list of a request: invalidating it refreshes them all. */
    documents: (requestId: string) =>
      ['account-requests', requestId, 'document-checklist'] as const,
    documentChecklist: (requestId: string, stage: DocumentStage) =>
      ['account-requests', requestId, 'document-checklist', stage] as const,
    bankDocuments: (requestId: string) =>
      ['account-requests', requestId, 'document-checklist', 'bank'] as const,
    confirmation: (requestId: string) =>
      ['account-requests', requestId, 'confirmation'] as const,
    relatedPersons: (requestId: string, filter: string) =>
      ['account-requests', requestId, 'related-persons', filter] as const,
    inquiries: (requestId: string) =>
      ['account-requests', requestId, 'inquiries'] as const,
    ownershipStructure: (requestId: string) =>
      ['account-requests', requestId, 'ownership-structure'] as const,
    filePreview: (requestId: string, itemId: string, fileId: string) =>
      [
        'account-requests',
        requestId,
        'document-items',
        itemId,
        'files',
        fileId,
        'preview-url',
      ] as const,
  },
  customerLookups: {
    get: (bankId: BankId, identification: string) =>
      ['customer-lookups', bankId, identification] as const,
  },
  exchangeRates: {
    get: (bankId: BankId, amountUsd: number) =>
      ['exchange-rates', bankId, amountUsd] as const,
  },
  relatedPartyMatrix: (bankId: BankId, legalEntityTypeId: string) =>
    ['related-party-matrix', bankId, legalEntityTypeId] as const,
  catalogs: {
    list: (
      bankId: BankId,
      name: CatalogName,
      params: Record<string, string | undefined> = {},
    ) => ['catalogs', bankId, name, params] as const,
    /** Catalog the portal cannot request: no bank, or a name it does not list. */
    unlisted: (name: string) => ['catalogs', 'unlisted', name] as const,
  },
  accountOpeningRequests: {
    sections: (requestId: string, stepCode: StepSlug, sectionCode?: string) =>
      sectionCode === undefined ?
        (['account-opening-requests', requestId, 'sections', stepCode] as const)
      : ([
          'account-opening-requests',
          requestId,
          'sections',
          stepCode,
          sectionCode,
        ] as const),
    stepAnswer: (requestId: string, stepCode: StepSlug) =>
      ['account-opening-requests', requestId, 'answer', stepCode] as const,
  },
} as const;

export { queryKeys };
