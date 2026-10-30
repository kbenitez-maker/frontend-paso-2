import { describe, expect, it } from 'vitest';

import { openingUpstream } from '../opening-upstream';

const NI = '2d01d06e-83f5-48d9-ab01-4c52244cddd1';
const CR = 'aab613d7-4a56-4b19-a47b-7e8e80dca7e8';
const FORM_API = 'https://localhost:54570/api';
const MOCK_API = 'http://localhost:4000';

const upstream = (
  slug: string[],
  extras: Partial<Parameters<typeof openingUpstream>[0]> = {},
) =>
  openingUpstream({
    slug,
    bank: undefined,
    formApi: undefined,
    formRequests: undefined,
    formRequestId: undefined,
    defaultApiBase: MOCK_API,
    localPreview: true,
    ...extras,
  });

describe('openingUpstream', () => {
  it('keeps a single base when the form upstream is unset', () => {
    expect(
      upstream(['account-opening-requests', NI, 'sections']),
    ).toMatchObject({
      slug: ['account-opening-requests', NI, 'sections'],
      apiBase: MOCK_API,
      fallbackBase: undefined,
    });
  });

  it('reads sections from the form api and does not fall back to the mock', () => {
    const result = upstream(['account-opening-requests', NI, 'sections'], {
      bank: 'blcr',
      formApi: `${FORM_API}/`,
      formRequests: JSON.stringify({ BLCR: CR }),
    });

    expect(result).toEqual({
      slug: ['account-opening-requests', CR, 'sections'],
      fallbackSlug: ['account-opening-requests', NI, 'sections'],
      apiBase: `${FORM_API}/`,
      fallbackBase: undefined,
    });
  });

  it('falls back to the mock for a catalog when the bases differ', () => {
    expect(
      upstream(['banks', 'BLNI', 'catalogs', 'sectors'], {
        formApi: FORM_API,
      }).fallbackBase,
    ).toBe(MOCK_API);
  });

  it('does not fall back when the form api is the default base', () => {
    expect(
      upstream(['account-opening-requests', NI, 'steps', 'company', 'answer'], {
        formApi: `${MOCK_API}/`,
      }).fallbackBase,
    ).toBeUndefined();
  });

  it('uses the single request id when the bank is not in the map', () => {
    const fallback = '5a8199e0-f69d-41f0-bcf3-550c56329f05';

    expect(
      upstream(['account-opening-requests', NI, 'sections'], {
        bank: 'BLHN',
        formApi: FORM_API,
        formRequests: JSON.stringify({ BLCR: CR }),
        formRequestId: `  ${fallback}  `,
      }).slug,
    ).toEqual(['account-opening-requests', fallback, 'sections']);
  });

  it('ignores a map that is not an object and a value that is not text', () => {
    const slug = ['account-opening-requests', NI, 'sections'];

    expect(upstream(slug, { bank: 'BLCR', formRequests: '[]' }).slug).toEqual(
      slug,
    );
    expect(upstream(slug, { bank: 'BLCR', formRequests: 'null' }).slug).toEqual(
      slug,
    );
    expect(
      upstream(slug, { bank: 'BLCR', formRequests: '{not json' }).slug,
    ).toEqual(slug);
    expect(
      upstream(slug, {
        bank: 'BLCR',
        formRequests: JSON.stringify({ BLCR: 12 }),
      }).slug,
    ).toEqual(slug);
  });

  it('leaves paths that are not the opening form on the default base', () => {
    expect(upstream(['users', 'me'], { formApi: FORM_API })).toMatchObject({
      slug: ['users', 'me'],
      apiBase: MOCK_API,
      fallbackBase: undefined,
    });
  });

  it('rewrites only the request id and keeps the original path for the fallback', () => {
    const documentId = '11111111-1111-4111-8111-111111111111';
    const slug = ['account-opening-requests', NI, 'documents', documentId];

    expect(
      upstream(slug, {
        bank: 'BLCR',
        formApi: FORM_API,
        formRequests: JSON.stringify({ BLCR: CR }),
      }),
    ).toMatchObject({
      slug: ['account-opening-requests', CR, 'documents', documentId],
      fallbackSlug: slug,
    });
  });

  it('does not rewrite the request or fall back outside a local GET', () => {
    expect(
      upstream(['account-opening-requests', NI, 'sections'], {
        bank: 'BLCR',
        formApi: FORM_API,
        formRequests: JSON.stringify({ BLCR: CR }),
        localPreview: false,
      }),
    ).toMatchObject({
      slug: ['account-opening-requests', NI, 'sections'],
      apiBase: MOCK_API,
      fallbackBase: undefined,
    });
  });
});
