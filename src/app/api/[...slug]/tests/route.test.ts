// @vitest-environment node
import { NextRequest } from 'next/server';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_API_BASE_URL: 'http://api.test',
    NEXT_PUBLIC_X_API_KEY: 'key',
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { logger } = await import('@/lib/logger');
const { POST } = await import('../route');

const fetchMock = vi.fn<typeof fetch>();

const forward = async (request: NextRequest) => {
  fetchMock.mockResolvedValue(
    new Response('{}', {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  await POST(request, {
    params: Promise.resolve({ slug: ['v1', 'files'] }),
  });
  const init = fetchMock.mock.calls[0]?.[1];
  return { init, headers: new Headers(init?.headers) };
};

describe('BFF proxy', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('logs an upstream error as a structured event without the query string', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"code":"bad"}', {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await POST(
      new NextRequest(
        'http://localhost/account-request/api/v1/files?secret=1',
        { method: 'POST', body: '{}' },
      ),
      { params: Promise.resolve({ slug: ['v1', 'files'] }) },
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Proxy upstream error response',
      expect.objectContaining({
        event: 'bff.upstream_error',
        method: 'POST',
        path: '/v1/files',
        status: 422,
        upstreamBody: '{"code":"bad"}',
      }),
    );
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      'secret',
    );
  });

  it('logs an unreachable upstream and answers 502', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new NextRequest('http://localhost/account-request/api/v1/files', {
        method: 'POST',
        body: '{}',
      }),
      { params: Promise.resolve({ slug: ['v1', 'files'] }) },
    );

    expect(response.status).toBe(502);
    expect(logger.error).toHaveBeenCalledWith(
      'Proxy upstream unreachable',
      expect.objectContaining({
        event: 'bff.upstream_failure',
        path: '/v1/files',
        error: 'connect ECONNREFUSED',
      }),
    );
  });

  it.each([
    ['cookie_unparsable', 'not-json'],
    ['access_token_missing', encodeURIComponent('{"user_id":"u1"}')],
  ])(
    'warns with %s when the session cookie has no usable token',
    async (reason, cookie) => {
      const { headers } = await forward(
        new NextRequest('http://localhost/account-request/api/v1/files', {
          method: 'POST',
          body: '{}',
          headers: { cookie: `auth_session=${cookie}` },
        }),
      );

      expect(headers.has('Authorization')).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Proxy auth: request sent without a bearer token',
        expect.objectContaining({ event: 'bff.auth_missing', reason }),
      );
    },
  );

  it('forwards the session token and logs the request', async () => {
    const cookie = encodeURIComponent('{"access_token":"t0k"}');
    const { headers } = await forward(
      new NextRequest('http://localhost/account-request/api/v1/files', {
        method: 'POST',
        body: '{}',
        headers: { cookie: `auth_session=${cookie}` },
      }),
    );

    expect(headers.get('Authorization')).toBe('Bearer t0k');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Proxy request',
      expect.objectContaining({
        event: 'bff.request',
        method: 'POST',
        path: '/v1/files',
        status: 201,
      }),
    );
  });

  it('warns with a reason when the session cookie is missing', async () => {
    await forward(
      new NextRequest('http://localhost/account-request/api/v1/files', {
        method: 'POST',
        body: '{}',
      }),
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'Proxy auth: request sent without a bearer token',
      expect.objectContaining({
        event: 'bff.auth_missing',
        reason: 'cookie_missing',
      }),
    );
  });

  it('forwards a JSON body as text with a JSON content type', async () => {
    const { init, headers } = await forward(
      new NextRequest('http://localhost/account-request/api/v1/files', {
        method: 'POST',
        body: JSON.stringify({ a: 1 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(init?.body).toBe('{"a":1}');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('forwards an upload as bytes keeping the multipart boundary', async () => {
    const form = new FormData();
    form.append(
      'file',
      new File(['PNG bytes'], 'a.png', { type: 'image/png' }),
    );
    const request = new NextRequest(
      'http://localhost/account-request/api/v1/files',
      { method: 'POST', body: form },
    );
    const sent = request.headers.get('content-type');

    const { init, headers } = await forward(request);

    expect(sent).toMatch(/^multipart\/form-data; boundary=/);
    expect(headers.get('content-type')).toBe(sent);
    const body = init?.body;
    if (!(body instanceof ArrayBuffer)) throw new Error('body is not bytes');
    const text = new TextDecoder().decode(body);
    expect(text).toContain('name="file"');
    expect(text).toContain('PNG bytes');
  });
});
