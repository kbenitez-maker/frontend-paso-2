import { describe, expect, it } from 'vitest';

import { CATALOG_NAMES } from '@/types/domain';

import {
  catalogApiName,
  endpoints,
  INTRANET_CATALOG_SEGMENTS,
} from '../endpoints';

describe('endpoints', () => {
  it('builds user paths', () => {
    expect(endpoints.users.me()).toBe('users/me');
  });

  it('builds bank paths', () => {
    expect(endpoints.banks.list()).toBe('banks');
  });

  it('builds account request paths', () => {
    expect(endpoints.accountRequests.list()).toBe('account-requests');
    expect(endpoints.accountRequests.create('BLNI')).toBe(
      'banks/BLNI/account-requests',
    );
    expect(endpoints.accountRequests.detail('abc')).toBe(
      'account-requests/abc',
    );
    expect(endpoints.accountRequests.progress('abc')).toBe(
      'account-requests/abc/progress',
    );
    expect(endpoints.accountRequests.fieldChecklist('abc')).toBe(
      'account-requests/abc/field-checklist',
    );
    expect(endpoints.accountRequests.section('abc', 'location')).toBe(
      'account-requests/abc/sections/location',
    );
  });

  it('builds document checklist and file paths', () => {
    expect(endpoints.accountRequests.documentChecklist('abc')).toBe(
      'account-requests/abc/document-checklist',
    );
    expect(endpoints.accountRequests.documentFiles('abc', 'deed')).toBe(
      'account-requests/abc/document-items/deed/files',
    );
    expect(endpoints.accountRequests.documentFile('abc', 'deed', 'f1')).toBe(
      'account-requests/abc/document-items/deed/files/f1',
    );
    expect(
      endpoints.accountRequests.documentFilePreviewUrl('abc', 'deed', 'f1'),
    ).toBe('account-requests/abc/document-items/deed/files/f1/preview-url');
  });

  it('builds confirmation and bank documents paths', () => {
    expect(endpoints.accountRequests.confirmation('abc')).toBe(
      'account-requests/abc/confirmation',
    );
    expect(endpoints.accountRequests.bankDocuments('abc')).toBe(
      'account-requests/abc/bank-documents',
    );
  });

  it('builds customer lookup and exchange rate paths', () => {
    expect(endpoints.customerLookups.get('BLNI')).toBe(
      'banks/BLNI/customer-lookup',
    );
    expect(endpoints.exchangeRates.get('BLNI')).toBe(
      'banks/BLNI/exchange-rates',
    );
  });

  it('builds the account-opening request creation path', () => {
    expect(endpoints.accountOpeningRequests.create()).toBe(
      'account-opening-requests',
    );
    expect(endpoints.accountOpeningRequests.sections('abc')).toBe(
      'account-opening-requests/abc/sections',
    );
    expect(endpoints.accountOpeningRequests.stepAnswer('abc', 'company')).toBe(
      'account-opening-requests/abc/steps/company/answer',
    );
    expect(endpoints.accountOpeningRequests.sections('a/b?c')).toBe(
      'account-opening-requests/a%2Fb%3Fc/sections',
    );
    expect(endpoints.accountOpeningRequests.stepAnswer('a/b', 'company')).toBe(
      'account-opening-requests/a%2Fb/steps/company/answer',
    );
  });

  it('builds catalog paths', () => {
    expect(endpoints.catalogs.list('BLPA', 'countries')).toBe(
      'banks/BLPA/catalogs/countries',
    );
    expect(endpoints.catalogs.list('BLNI', 'identification-types')).toBe(
      'banks/BLNI/catalogs/IDTypes',
    );
    expect(endpoints.catalogs.list('BLNI', 'branches')).toBe(
      'banks/BLNI/catalogs/Branch',
    );
    expect(endpoints.catalogs.list('BLNI', 'legal-entity-types')).toBe(
      'banks/BLNI/catalogs/LegalEntityTypes',
    );
  });

  it('maps every catalog name to a stable intranet segment', () => {
    for (const name of CATALOG_NAMES) {
      const segment = catalogApiName(name);
      // eslint-disable-next-line security/detect-object-injection -- name from CATALOG_NAMES
      expect(segment).toBe(INTRANET_CATALOG_SEGMENTS[name]);
      expect(endpoints.catalogs.list('BLNI', name)).toBe(
        `banks/BLNI/catalogs/${segment}`,
      );
    }
  });
});
