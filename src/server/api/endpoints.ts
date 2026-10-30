import type { StepSlug } from '@/lib/constants/steps';
import type { BankId, CatalogName } from '@/types/domain';
import type { SectionKey } from '@/types/request';

import { CATALOG_NAMES } from '@/types/domain';

/**
 * Single source of truth for all API endpoint path builders.
 *
 * Path parameters are function arguments — never construct URLs outside this
 * module. Query parameters travel separately via `RequestOptions.params`.
 * Paths are relative: the adapters prepend the API version (`/v1`).
 */

/**
 * Intranet catalog segment of `GET /v1/banks/{bankId}/catalogs/{catalogName}`.
 * Form contracts use kebab-case `CatalogName` values; only the rows below use
 * a different intranet segment. Every other name is sent as-is (kebab-case).
 */
const SPECIAL_INTRANET_CATALOG_SEGMENTS = {
  'identification-types': 'IDTypes',
  branches: 'Branch',
  'legal-entity-types': 'LegalEntityTypes',
} as const satisfies Partial<Record<CatalogName, string>>;

const INTRANET_CATALOG_SEGMENTS: Record<CatalogName, string> =
  CATALOG_NAMES.reduce<Record<CatalogName, string>>(
    (segments, name) => {
      // eslint-disable-next-line security/detect-object-injection -- name from CATALOG_NAMES
      segments[name] = name;
      return segments;
    },
    {} as Record<CatalogName, string>,
  );

for (const name of Object.keys(
  SPECIAL_INTRANET_CATALOG_SEGMENTS,
) as (keyof typeof SPECIAL_INTRANET_CATALOG_SEGMENTS)[]) {
  // eslint-disable-next-line security/detect-object-injection -- keys from SPECIAL_INTRANET_CATALOG_SEGMENTS
  INTRANET_CATALOG_SEGMENTS[name] = SPECIAL_INTRANET_CATALOG_SEGMENTS[name];
}

const catalogApiName = (name: CatalogName): string =>
  // eslint-disable-next-line security/detect-object-injection -- name is CatalogName
  INTRANET_CATALOG_SEGMENTS[name];

const endpoints = {
  users: {
    /**
     * Profile and navigation modules of the authenticated user.
     *
     * @returns Path to the current user resource.
     * @example endpoints.users.me() // 'users/me'
     */
    me: (): string => 'users/me',
  },
  banks: {
    /**
     * Banks the account request can be opened for, with their country and
     * whether new requests are enabled.
     *
     * @returns Path to the banks collection.
     * @example endpoints.banks.list() // 'banks'
     */
    list: (): string => 'banks',
  },
  accountRequests: {
    /**
     * The authenticated user's account requests. Filters and paging travel as
     * query params (`status`, `bank_id`, `page`, `page_size`) via `RequestOptions.params`.
     *
     * @returns Path to the account-requests collection.
     * @example endpoints.accountRequests.list() // 'account-requests'
     */
    list: (): string => 'account-requests',

    /**
     * Collection under which a bank's account requests are created.
     *
     * @param bankId - Bank the request is opened for.
     * @returns Path to the bank's account-requests collection.
     * @example endpoints.accountRequests.create('BLNI') // 'banks/BLNI/account-requests'
     */
    create: (bankId: BankId): string => `banks/${bankId}/account-requests`,

    /**
     * A single account request.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the account request resource.
     * @example endpoints.accountRequests.detail('0b9f…') // 'account-requests/0b9f…'
     */
    detail: (requestId: string): string => `account-requests/${requestId}`,

    /**
     * Profiling answers of an account request (read through `detail`). `PATCH`
     * changes the ones the applicant may still change.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the profiling resource.
     * @example endpoints.accountRequests.profiling('0b9f…') // 'account-requests/0b9f…/profiling'
     */
    profiling: (requestId: string): string =>
      `account-requests/${requestId}/profiling`,

    /**
     * Changes of the legal entity type. `POST` applies one atomically (route,
     * related parties, documents, ownership seal).
     *
     * @param requestId - Account request identifier.
     * @returns Path to the reclassifications collection.
     * @example endpoints.accountRequests.reclassifications('0b9f…') // 'account-requests/0b9f…/reclassifications'
     */
    reclassifications: (requestId: string): string =>
      `account-requests/${requestId}/reclassifications`,

    /**
     * What a change of the legal entity type would do, without applying it.
     * `POST` with the same body as `reclassifications`.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the reclassification preview.
     * @example endpoints.accountRequests.reclassificationPreview('0b9f…') // 'account-requests/0b9f…/reclassifications/preview'
     */
    reclassificationPreview: (requestId: string): string =>
      `account-requests/${requestId}/reclassifications/preview`,

    /**
     * Completion of an account request: overall percent plus the filled and
     * applicable field counts of every step block.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the progress resource.
     * @example endpoints.accountRequests.progress('0b9f…') // 'account-requests/0b9f…/progress'
     */
    progress: (requestId: string): string =>
      `account-requests/${requestId}/progress`,

    /**
     * Per-field checklist of a step: which fields it asks for and how filled
     * each one is. The step travels as the `step` query param (`RequestOptions.params`).
     *
     * @param requestId - Account request identifier.
     * @returns Path to the field checklist resource.
     * @example endpoints.accountRequests.fieldChecklist('0b9f…') // 'account-requests/0b9f…/field-checklist'
     */
    fieldChecklist: (requestId: string): string =>
      `account-requests/${requestId}/field-checklist`,

    /**
     * One form section of an account request. `GET` reads it; `PUT` replaces
     * it and takes `mode=draft|complete` as a query param (`RequestOptions.params`).
     *
     * @param requestId - Account request identifier.
     * @param sectionKey - Section the data belongs to.
     * @returns Path to the section resource.
     * @example endpoints.accountRequests.section('0b9f…', 'location') // 'account-requests/0b9f…/sections/location'
     */
    section: (requestId: string, sectionKey: SectionKey): string =>
      `account-requests/${requestId}/sections/${sectionKey}`,

    /**
     * Documents the request must attach, with the files already uploaded to
     * each item. The stage travels as the `stage` query param (`RequestOptions.params`).
     *
     * @param requestId - Account request identifier.
     * @returns Path to the document checklist resource.
     * @example endpoints.accountRequests.documentChecklist('0b9f…') // 'account-requests/0b9f…/document-checklist'
     */
    documentChecklist: (requestId: string): string =>
      `account-requests/${requestId}/document-checklist`,

    /**
     * Files of one checklist item. `POST` uploads one (multipart, field `file`).
     *
     * @param requestId - Account request identifier.
     * @param itemId - Checklist item the file belongs to.
     * @returns Path to the item's files collection.
     * @example endpoints.accountRequests.documentFiles('0b9f…', 'deed') // 'account-requests/0b9f…/document-items/deed/files'
     */
    documentFiles: (requestId: string, itemId: string): string =>
      `account-requests/${requestId}/document-items/${itemId}/files`,

    /**
     * One uploaded file. `DELETE` removes it from the item.
     *
     * @param requestId - Account request identifier.
     * @param itemId - Checklist item the file belongs to.
     * @param fileId - Uploaded file identifier.
     * @returns Path to the file resource.
     * @example endpoints.accountRequests.documentFile('0b9f…', 'deed', 'f1') // 'account-requests/0b9f…/document-items/deed/files/f1'
     */
    documentFile: (requestId: string, itemId: string, fileId: string): string =>
      `account-requests/${requestId}/document-items/${itemId}/files/${fileId}`,

    /**
     * Short-lived URL to display an uploaded file (preview and thumbnail).
     *
     * @param requestId - Account request identifier.
     * @param itemId - Checklist item the file belongs to.
     * @param fileId - Uploaded file identifier.
     * @returns Path to the preview-url resource.
     * @example endpoints.accountRequests.documentFilePreviewUrl('0b9f…', 'deed', 'f1') // 'account-requests/0b9f…/document-items/deed/files/f1/preview-url'
     */
    documentFilePreviewUrl: (
      requestId: string,
      itemId: string,
      fileId: string,
    ): string =>
      `account-requests/${requestId}/document-items/${itemId}/files/${fileId}/preview-url`,

    /**
     * Review of the captured data before the documents: read-only echo of the
     * answers, the legal representative who signs and the accepted statements.
     * `GET` reads it; `PUT` saves the signer and the statements.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the confirmation resource.
     * @example endpoints.accountRequests.confirmation('0b9f…') // 'account-requests/0b9f…/confirmation'
     */
    confirmation: (requestId: string): string =>
      `account-requests/${requestId}/confirmation`,

    /**
     * People registered in the request (related parties, customers and
     * suppliers) that a later step picks one of. Filters travel as query params
     * (`role`: comma-separated, any of them; `person_type`).
     *
     * @param requestId - Account request identifier.
     * @returns Path to the related-persons collection.
     * @example endpoints.accountRequests.relatedPersons('0b9f…') // 'account-requests/0b9f…/related-persons'
     */
    relatedPersons: (requestId: string): string =>
      `account-requests/${requestId}/related-persons`,

    /**
     * Questions the applicant sends to the officer without leaving the form,
     * with the answers. `GET` lists them oldest first; `POST` sends one.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the inquiries collection.
     * @example endpoints.accountRequests.inquiries('0b9f…') // 'account-requests/0b9f…/inquiries'
     */
    inquiries: (requestId: string): string =>
      `account-requests/${requestId}/inquiries`,

    /**
     * Documents the bank generates for the applicant to sign and return, with
     * the phase they are in. Files travel through the `document-items` paths.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the bank documents resource.
     * @example endpoints.accountRequests.bankDocuments('0b9f…') // 'account-requests/0b9f…/bank-documents'
     */
    bankDocuments: (requestId: string): string =>
      `account-requests/${requestId}/bank-documents`,

    /**
     * Submissions of an account request. `POST` hands the request to the bank
     * once every step is complete.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the submissions collection.
     * @example endpoints.accountRequests.submissions('0b9f…') // 'account-requests/0b9f…/submissions'
     */
    submissions: (requestId: string): string =>
      `account-requests/${requestId}/submissions`,

    /**
     * Satisfaction survey (NPS) answers of a submitted request. `POST` records
     * the score and comment, or that the applicant skipped it.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the NPS responses collection.
     * @example endpoints.accountRequests.npsResponses('0b9f…') // 'account-requests/0b9f…/nps-responses'
     */
    npsResponses: (requestId: string): string =>
      `account-requests/${requestId}/nps-responses`,

    /**
     * Ownership structure of the shareholders: threshold, stored confirmation
     * (seal) and, while it is current, the natural persons with their total
     * participation.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the ownership structure resource.
     * @example endpoints.accountRequests.ownershipStructure('0b9f…') // 'account-requests/0b9f…/ownership-structure'
     */
    ownershipStructure: (requestId: string): string =>
      `account-requests/${requestId}/ownership-structure`,

    /**
     * Confirmation of the ownership structure. `POST` runs the participation
     * calculation and seals the structure; `DELETE` reopens it.
     *
     * @param requestId - Account request identifier.
     * @returns Path to the confirmation of the ownership structure.
     * @example endpoints.accountRequests.ownershipConfirmation('0b9f…') // 'account-requests/0b9f…/ownership-structure/confirmation'
     */
    ownershipConfirmation: (requestId: string): string =>
      `account-requests/${requestId}/ownership-structure/confirmation`,
  },
  customerLookups: {
    /**
     * Dual lookup (Intranet customers and onboarding requests) of a company's
     * identification. The number travels as the `IDENTIFICATION` query param.
     *
     * @param bankId - Bank the company would onboard with.
     * @returns Path to the bank's customer lookup.
     * @example endpoints.customerLookups.get('BLNI') // 'banks/BLNI/customer-lookup'
     */
    get: (bankId: BankId): string => `banks/${bankId}/customer-lookup`,
  },
  exchangeRates: {
    /**
     * Daily USD quote for the bank. An optional `AMOUNT` query param converts
     * that dollar amount with the buying rate.
     *
     * @param bankId - Bank whose local currency is the base.
     * @returns Path to the bank's exchange rates.
     * @example endpoints.exchangeRates.get('BLNI') // 'banks/BLNI/exchange-rates'
     */
    get: (bankId: BankId): string => `banks/${bankId}/exchange-rates`,
  },
  accountOpeningRequests: {
    /**
     * Starts a draft account-opening request. The bank travels in the body.
     *
     * @returns Path to the account-opening requests collection.
     * @example endpoints.accountOpeningRequests.create() // 'account-opening-requests'
     */
    create: (): string => 'account-opening-requests',

    /**
     * Fields and saved values of one form step. The step travels as
     * `step_code` (`RequestOptions.params`).
     *
     * @param requestId - Account-opening request identifier.
     * @returns Path to the step sections resource.
     * @example endpoints.accountOpeningRequests.sections('0b9f…') // 'account-opening-requests/0b9f…/sections'
     */
    sections: (requestId: string): string =>
      `account-opening-requests/${encodeURIComponent(requestId)}/sections`,

    /**
     * Saved answer of one form step. `GET` reads it (`{}` before the first
     * save); `PUT` replaces the whole payload.
     *
     * @param requestId - Account-opening request identifier.
     * @param stepCode - Form step code, e.g. `company`.
     * @returns Path to the step answer resource.
     * @example endpoints.accountOpeningRequests.stepAnswer('0b9f…', 'company') // 'account-opening-requests/0b9f…/steps/company/answer'
     */
    stepAnswer: (requestId: string, stepCode: StepSlug): string =>
      `account-opening-requests/${encodeURIComponent(requestId)}/steps/${encodeURIComponent(stepCode)}/answer`,
  },
  /**
   * Entry of the regional related-parties matrix for a legal entity type of
   * the bank: registration route, related-parties sections and the roles each
   * one requires. The type travels as the `legal_entity_type_id` query param.
   *
   * @param bankId - Bank of the request.
   * @returns Path to the bank's related-party matrix resource.
   * @example endpoints.relatedPartyMatrix('BLNI') // 'banks/BLNI/related-party-matrix'
   */
  relatedPartyMatrix: (bankId: BankId): string =>
    `banks/${bankId}/related-party-matrix`,
  catalogs: {
    /**
     * Reference data used by form fields.
     *
     * @param bankId - Bank whose catalog is requested.
     * @param name - Catalog name.
     * @returns Path to the catalog resource.
     * @example endpoints.catalogs.list('BLNI', 'countries') // 'banks/BLNI/catalogs/countries'
     * @example endpoints.catalogs.list('BLNI', 'identification-types') // 'banks/BLNI/catalogs/IDTypes'
     */
    list: (bankId: BankId, name: CatalogName): string =>
      `banks/${bankId}/catalogs/${catalogApiName(name)}`,
  },
} as const;

export { catalogApiName, endpoints, INTRANET_CATALOG_SEGMENTS };
