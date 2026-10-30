import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APIVersion } from '@lafise/lde-web-lib';

const mockQuery = vi.fn((config: unknown) => config);
const mockMutation = vi.fn((config: unknown) => config);
const mockGet = vi.fn();

vi.mock('@/lib/query', () => ({
  queryAdapter: { query: mockQuery, mutation: mockMutation },
}));

vi.mock('@/lib/http', () => ({ Http: { get: mockGet } }));

const {
  accountRequestQuery,
  accountRequestsListQuery,
  banksQuery,
  catalogQuery,
  fieldChecklistQuery,
  getAccountRequest,
  getBanks,
  requestProgressQuery,
  sectionMutation,
  sectionQuery,
  userMeQuery,
} = await import('../index');

const V1 = { apiVersion: APIVersion.V1 };

describe('server api resources', () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  it('configures the users/me query', () => {
    userMeQuery();

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['users', 'me'],
      url: 'users/me',
      options: V1,
    });
  });

  it('configures the banks query', () => {
    banksQuery();

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['banks', 'list'],
      url: 'banks',
      options: V1,
    });
  });

  it('reads the banks server-side with the bearer token', async () => {
    await getBanks('token-1');

    expect(mockGet).toHaveBeenCalledWith('banks', {
      ...V1,
      headers: { Authorization: 'Bearer token-1' },
    });
  });

  it('configures the account request query', () => {
    accountRequestQuery('abc');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc'],
      url: 'account-requests/abc',
      options: V1,
    });
  });

  it('configures the list query with its filters as query params', () => {
    accountRequestsListQuery({ status: 'draft', page: 2, page_size: 10 });
    accountRequestsListQuery();

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: [
        'account-requests',
        'list',
        { status: 'draft', page: '2', page_size: '10' },
      ],
      url: 'account-requests',
      options: {
        ...V1,
        params: { status: 'draft', page: '2', page_size: '10' },
      },
    });
    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'list', {}],
      url: 'account-requests',
      options: { ...V1, params: {} },
    });
  });

  it('configures the progress query', () => {
    requestProgressQuery('abc');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc', 'progress'],
      url: 'account-requests/abc/progress',
      options: V1,
    });
  });

  it('configures the field checklist query with the step as a query param', () => {
    fieldChecklistQuery('abc', 'company');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc', 'field-checklist', 'company'],
      url: 'account-requests/abc/field-checklist',
      options: { ...V1, params: { step: 'company' } },
    });
  });

  it('configures the section query', () => {
    sectionQuery('abc', 'location');

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['account-requests', 'abc', 'sections', 'location'],
      url: 'account-requests/abc/sections/location',
      options: V1,
    });
  });

  it('configures the section mutation as a PUT with the save mode', () => {
    sectionMutation('abc', 'location', 'draft');

    expect(mockMutation).toHaveBeenCalledWith({
      url: 'account-requests/abc/sections/location',
      method: 'put',
      options: { ...V1, params: { mode: 'draft' } },
    });
  });

  it('passes the parent of a dependent catalog as parent_id', () => {
    catalogQuery('BLNI', 'municipalities', { parent_id: 'managua' });

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: [
        'catalogs',
        'BLNI',
        'municipalities',
        { parent_id: 'managua' },
      ],
      url: 'banks/BLNI/catalogs/municipalities',
      options: { ...V1, params: { parent_id: 'managua' } },
    });
  });

  it('passes catalog params as query params', () => {
    catalogQuery('BLNI', 'countries', { search: 'ni' });

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['catalogs', 'BLNI', 'countries', { search: 'ni' }],
      url: 'banks/BLNI/catalogs/countries',
      options: { ...V1, params: { search: 'ni' } },
    });
  });

  it('passes person_type for identification-types', () => {
    catalogQuery('BLNI', 'identification-types', { person_type: 'legal' });

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: [
        'catalogs',
        'BLNI',
        'identification-types',
        { person_type: 'legal' },
      ],
      url: 'banks/BLNI/catalogs/IDTypes',
      options: { ...V1, params: { person_type: 'legal' } },
    });
  });

  it('does not send person_type for other catalogs', () => {
    catalogQuery('BLNI', 'branches', {});

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: ['catalogs', 'BLNI', 'branches', {}],
      url: 'banks/BLNI/catalogs/Branch',
      options: { ...V1, params: {} },
    });
  });

  it('reads an account request server-side with the bearer token', async () => {
    await getAccountRequest('abc', 'token-1');
    await getAccountRequest('abc', null);

    expect(mockGet).toHaveBeenNthCalledWith(1, 'account-requests/abc', {
      ...V1,
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, 'account-requests/abc', {
      ...V1,
      headers: {},
    });
  });
});
