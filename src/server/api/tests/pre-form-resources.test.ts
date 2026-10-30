import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APIVersion } from '@lafise/lde-web-lib';

const mockQuery = vi.fn((config: unknown) => config);
const mockMutation = vi.fn((config: unknown) => config);
const mockDelete = vi.fn();

vi.mock('@/lib/query', () => ({
  queryAdapter: { query: mockQuery, mutation: mockMutation },
}));

vi.mock('@/lib/http-internal', () => ({
  HttpInternal: { delete: mockDelete },
}));

const {
  bankDocumentsQuery,
  confirmationQuery,
  accountOpeningSectionsQuery,
  accountOpeningStepAnswerQuery,
  createAccountOpeningRequestMutation,
  upsertAccountOpeningStepAnswerMutation,
  customerLookupQuery,
  exchangeRateQuery,
  isAccountOpeningRequestCreated,
  isCustomerLookup,
  isExchangeRate,
  deleteDocumentFileMutation,
  documentChecklistQuery,
  filePreviewQuery,
  LOOKUP_TIMEOUT_MS,
  saveConfirmationMutation,
  uploadDocumentFileMutation,
} = await import('../index');
const { uploadFraction } = await import('../document-checklist');

const V1 = { apiVersion: APIVersion.V1 };

const isProgressHandler = (value: unknown): value is (event: unknown) => void =>
  typeof value === 'function';

const NEW_COMPANY = {
  company_exists: false,
  has_active_onboarding_request: false,
  onboarding_lookup_available: true,
};

describe('customer lookup', () => {
  it('reads the identification and gives up after the time limit', () => {
    customerLookupQuery('BLNI', 'J0310000000018');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['customer-lookups', 'BLNI', 'J0310000000018'],
      url: 'banks/BLNI/customer-lookup',
      options: {
        ...V1,
        timeout: LOOKUP_TIMEOUT_MS,
        params: { IDENTIFICATION: 'J0310000000018' },
      },
    });
    expect(LOOKUP_TIMEOUT_MS).toBe(10_000);
  });

  it('accepts the lookup body and rejects a payload that is not that shape', () => {
    expect(isCustomerLookup(NEW_COMPANY)).toBe(true);
    expect(isCustomerLookup({ outcome: 'new_to_bank' })).toBe(false);
    expect(
      isCustomerLookup({ ...NEW_COMPANY, has_active_onboarding_request: null }),
    ).toBe(true);
    expect(isCustomerLookup(null)).toBe(false);
  });
});

const NIO_QUOTE = {
  base_currency: 'NIO',
  rate_date: '2026-10-14',
  rates: [{ currency: 'USD', buying: 36.45, selling: 37.5, official: 36.6243 }],
  conversion: {
    amount_usd: 1000,
    rate_type: 'buying',
    rate: 36.45,
    local_amount: 36450,
  },
};

describe('exchange rates', () => {
  it('reads the buying-rate conversion for a dollar amount', () => {
    exchangeRateQuery('BLNI', 1000);

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['exchange-rates', 'BLNI', 1000],
      url: 'banks/BLNI/exchange-rates',
      options: { ...V1, params: { AMOUNT: '1000' } },
    });
  });

  it('accepts a quote and rejects a payload that is not that shape', () => {
    expect(isExchangeRate(NIO_QUOTE)).toBe(true);
    expect(isExchangeRate({ ...NIO_QUOTE, conversion: null })).toBe(true);
    expect(isExchangeRate({ base_currency: 'NIO' })).toBe(false);
    expect(isExchangeRate({ ...NIO_QUOTE, base_currency: 'nio' })).toBe(false);
    expect(
      isExchangeRate({
        ...NIO_QUOTE,
        conversion: {
          ...NIO_QUOTE.conversion,
          local_amount: Number.POSITIVE_INFINITY,
        },
      }),
    ).toBe(false);
  });
});

const CREATED = {
  request_id: '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01',
  form_version_id: 3,
  operating_country_id: 1,
  bank_id: 'BLNI',
  legal_name: 'Empresa Demo S.A.',
  identification_number: 'J0310000000001',
  status_code: 'DRAFT',
  status: 'Draft',
  can_edit: true,
  entity_type_code: 'corporation',
  annual_sales_usd: 1250.5,
  branch_code: 'branch-1',
};

describe('account opening request sections', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it('reads the step sections with step_code as a query param', () => {
    accountOpeningSectionsQuery('abc', 'company');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-opening-requests', 'abc', 'sections', 'company'],
      url: 'account-opening-requests/abc/sections',
      options: { ...V1, params: { step_code: 'company' } },
    });
  });

  it('adds section_code when a company section is requested', () => {
    accountOpeningSectionsQuery('abc', 'company', 'contact');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: [
        'account-opening-requests',
        'abc',
        'sections',
        'company',
        'contact',
      ],
      url: 'account-opening-requests/abc/sections',
      options: {
        ...V1,
        params: { step_code: 'company', section_code: 'contact' },
      },
    });
  });

  it('keeps a local preview bank in the sections cache key', () => {
    accountOpeningSectionsQuery('abc', 'company', 'contact', 'BLCR');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'account-opening-requests',
          'abc',
          'sections',
          'company',
          'contact',
          'BLCR',
        ],
      }),
    );
  });
});

describe('account opening step answer', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockMutation.mockClear();
  });

  it('reads the saved answer of a step by its code', () => {
    accountOpeningStepAnswerQuery('abc', 'company');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-opening-requests', 'abc', 'answer', 'company'],
      url: 'account-opening-requests/abc/steps/company/answer',
      options: V1,
    });
  });

  it('keeps a local preview bank in the step answer cache key', () => {
    accountOpeningStepAnswerQuery('abc', 'company', 'BLCR');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'account-opening-requests',
          'abc',
          'answer',
          'company',
          'BLCR',
        ],
      }),
    );
  });

  it('omits an empty preview bank from the step answer cache key', () => {
    accountOpeningStepAnswerQuery('abc', 'company', '');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['account-opening-requests', 'abc', 'answer', 'company'],
      }),
    );
  });

  it('replaces the saved answer of a step with a PUT', () => {
    upsertAccountOpeningStepAnswerMutation('abc', 'company');

    expect(mockMutation).toHaveBeenCalledWith({
      url: 'account-opening-requests/abc/steps/company/answer',
      method: 'put',
      options: V1,
    });
  });
});

describe('account opening request creation', () => {
  beforeEach(() => {
    mockMutation.mockClear();
  });

  it('posts the draft to the account-opening collection', () => {
    createAccountOpeningRequestMutation();

    expect(mockMutation).toHaveBeenCalledWith({
      url: 'account-opening-requests',
      method: 'post',
      options: V1,
    });
  });

  it('accepts any draft that carries a request id and rejects anything else', () => {
    expect(isAccountOpeningRequestCreated(CREATED)).toBe(true);
    expect(
      isAccountOpeningRequestCreated({ request_id: CREATED.request_id }),
    ).toBe(true);
    expect(
      isAccountOpeningRequestCreated({ ...CREATED, entity_type_code: '' }),
    ).toBe(true);
    expect(
      isAccountOpeningRequestCreated({ ...CREATED, annual_sales_usd: -1 }),
    ).toBe(true);
    expect(isAccountOpeningRequestCreated({ ...CREATED, request_id: 9 })).toBe(
      false,
    );
    expect(isAccountOpeningRequestCreated({ request_id: 'req-9' })).toBe(false);
    expect(isAccountOpeningRequestCreated(null)).toBe(false);
  });
});

describe('closing resources', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockMutation.mockClear();
  });

  it('reads the confirmation and saves it with PUT', () => {
    confirmationQuery('abc');
    saveConfirmationMutation('abc');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc', 'confirmation'],
      url: 'account-requests/abc/confirmation',
      options: V1,
    });
    expect(mockMutation).toHaveBeenCalledWith({
      url: 'account-requests/abc/confirmation',
      method: 'put',
      options: V1,
    });
  });

  it('reads the bank documents under the document lists key prefix', () => {
    bankDocumentsQuery('abc');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc', 'document-checklist', 'bank'],
      url: 'account-requests/abc/bank-documents',
      options: V1,
    });
  });
});

describe('document checklist resources', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockMutation.mockClear();
    mockDelete.mockReset();
  });

  it('reads the checklist of a stage as a query param', () => {
    documentChecklistQuery('abc', 'base');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc', 'document-checklist', 'base'],
      url: 'account-requests/abc/document-checklist',
      options: { ...V1, params: { stage: 'base' } },
    });
  });

  it('reads the short-lived URL of a file', () => {
    filePreviewQuery('abc', 'deed', 'f1');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: [
        'account-requests',
        'abc',
        'document-items',
        'deed',
        'files',
        'f1',
        'preview-url',
      ],
      url: 'account-requests/abc/document-items/deed/files/f1/preview-url',
      options: V1,
    });
  });

  it('uploads as multipart, overriding the JSON default of the client', () => {
    uploadDocumentFileMutation('abc', 'deed');

    expect(mockMutation).toHaveBeenCalledWith({
      url: 'account-requests/abc/document-items/deed/files',
      method: 'post',
      options: { ...V1, headers: { 'Content-Type': 'multipart/form-data' } },
    });
  });

  it('reports the real upload fraction from the transport events', () => {
    const onProgress = vi.fn();
    uploadDocumentFileMutation('abc', 'deed', onProgress);
    const config: unknown = mockMutation.mock.calls[0]?.[0];
    const options: unknown =
      typeof config === 'object' && config !== null ?
        Reflect.get(config, 'options')
      : undefined;
    const notify: unknown =
      typeof options === 'object' && options !== null ?
        Reflect.get(options, 'onUploadProgress')
      : undefined;
    if (!isProgressHandler(notify)) throw new Error('no progress callback');

    notify({ loaded: 25, total: 100 });
    notify({ loaded: 5 });

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(0.25);
  });

  it('deletes the file named by the variable and throws on failure', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined, error: null });
    const { mutationFn } = deleteDocumentFileMutation('abc', 'deed');

    await mutationFn('f1');

    expect(mockDelete).toHaveBeenCalledWith(
      'account-requests/abc/document-items/deed/files/f1',
      V1,
    );

    const failure = new Error('gone');
    mockDelete.mockResolvedValueOnce({ data: null, error: failure });
    await expect(mutationFn('f2')).rejects.toBe(failure);
  });
});

describe('uploadFraction', () => {
  it('is the sent part of the total, capped at one', () => {
    expect(uploadFraction({ loaded: 50, total: 200 })).toBe(0.25);
    expect(uploadFraction({ loaded: 300, total: 200 })).toBe(1);
  });

  it('has no fraction without a usable total', () => {
    expect(uploadFraction({ loaded: 5 })).toBeUndefined();
    expect(uploadFraction({ loaded: 5, total: 0 })).toBeUndefined();
    expect(uploadFraction(null)).toBeUndefined();
    expect(uploadFraction('x')).toBeUndefined();
  });
});
