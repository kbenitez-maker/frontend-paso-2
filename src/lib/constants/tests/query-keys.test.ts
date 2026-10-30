import { describe, expect, it } from 'vitest';

import { queryKeys } from '../query-keys';

describe('queryKeys', () => {
  it('builds stable keys', () => {
    expect(queryKeys.users.me()).toEqual(['users', 'me']);
    expect(queryKeys.banks.list()).toEqual(['banks', 'list']);
    expect(queryKeys.accountRequests.detail('abc')).toEqual([
      'account-requests',
      'abc',
    ]);
    expect(queryKeys.accountRequests.progress('abc')).toEqual([
      'account-requests',
      'abc',
      'progress',
    ]);
    expect(queryKeys.accountRequests.fieldChecklist('abc', 'company')).toEqual([
      'account-requests',
      'abc',
      'field-checklist',
      'company',
    ]);
    expect(queryKeys.accountRequests.section('abc', 'location')).toEqual([
      'account-requests',
      'abc',
      'sections',
      'location',
    ]);
    expect(queryKeys.accountOpeningRequests.sections('abc', 'company')).toEqual(
      ['account-opening-requests', 'abc', 'sections', 'company'],
    );
    expect(
      queryKeys.accountOpeningRequests.sections('abc', 'company', 'contact'),
    ).toEqual([
      'account-opening-requests',
      'abc',
      'sections',
      'company',
      'contact',
    ]);
    expect(
      queryKeys.accountOpeningRequests.stepAnswer('abc', 'company'),
    ).toEqual(['account-opening-requests', 'abc', 'answer', 'company']);
    expect(
      queryKeys.catalogs.list('BLNI', 'countries', { search: 'ni' }),
    ).toEqual(['catalogs', 'BLNI', 'countries', { search: 'ni' }]);
    expect(queryKeys.catalogs.unlisted('genders')).toEqual([
      'catalogs',
      'unlisted',
      'genders',
    ]);
  });

  it('defaults catalog params to an empty object', () => {
    expect(queryKeys.catalogs.list('BLPA', 'currencies')).toEqual([
      'catalogs',
      'BLPA',
      'currencies',
      {},
    ]);
  });
});
