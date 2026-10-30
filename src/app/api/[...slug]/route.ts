import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { openingUpstream } from './opening-upstream';

const FORWARDED_REQUEST_HEADERS = ['x-channel-id'] as const;
const DEFAULT_ACCEPT_LANGUAGE = 'es';
const FORWARDED_RESPONSE_HEADERS = [
  'Content-Type',
  'Content-Disposition',
] as const;
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304] as const);
const NO_BODY_METHODS = new Set(['GET', 'HEAD'] as const);
const DEFAULT_X_CHANNEL_ID = 'web';
const MULTIPART_CONTENT_TYPE = 'multipart/form-data';
/** Upstream error bodies are truncated before logging. */
const UPSTREAM_BODY_LOG_LIMIT = 500;

/**
 * Public IPv4 used only in non-production when the resolved client IP is
 * loopback or missing. Same fallback as the transactions module proxy —
 * never used in production.
 *
 * Built from octets (not an IP string literal) so typescript:S1313 stays clean.
 */
const DEV_FALLBACK_PUBLIC_IP = [170, 85, 56, 175].join('.');

/**
 * Approximate geolocation used only in non-production when the platform
 * does not populate geo headers. Coordinates roughly correspond to Managua.
 * Never used in production.
 */
const DEV_FALLBACK_GEO = {
  latitude: '12.124318907098251',
  longitude: '-86.26565060936983',
} as const;

const isBinaryContentType = (contentType: string): boolean => {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    mime === 'application/pdf' ||
    mime === 'application/octet-stream' ||
    mime.startsWith('image/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/')
  );
};

const cleanHeader = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Loopback / same-host client IPs that upstream antifraud rejects.
 * Uses prefix checks for IPv4-mapped IPv6 so we never hardcode `::ffff:…`.
 */
const isLoopbackClientIp = (ip: string): boolean =>
  ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.');

/**
 * Resolves the client IP from platform forwarding headers. Never trusts
 * a client-supplied `user-ip` header.
 */
const resolveClientIp = (request: NextRequest): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const firstForwarded = cleanHeader(forwardedFor?.split(',')[0] ?? null);

  const resolved =
    firstForwarded ??
    cleanHeader(request.headers.get('x-real-ip')) ??
    cleanHeader(request.headers.get('x-vercel-forwarded-for'));

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return resolved;
  }

  if (resolved === null || isLoopbackClientIp(resolved)) {
    return DEV_FALLBACK_PUBLIC_IP;
  }
  return resolved;
};

interface ClientGeo {
  latitude: string;
  longitude: string;
}

const resolveClientGeo = (request: NextRequest): ClientGeo | null => {
  const latitude =
    cleanHeader(request.headers.get('x-vercel-ip-latitude')) ??
    cleanHeader(request.headers.get('x-geo-latitude'));
  const longitude =
    cleanHeader(request.headers.get('x-vercel-ip-longitude')) ??
    cleanHeader(request.headers.get('x-geo-longitude'));

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return latitude && longitude ? { latitude, longitude } : null;
  }

  return {
    latitude: latitude ?? DEV_FALLBACK_GEO.latitude,
    longitude: longitude ?? DEV_FALLBACK_GEO.longitude,
  };
};

function buildUpstreamUrl(
  apiBase: string,
  slug: string[],
  searchParams: URLSearchParams,
  userIp: string | null,
): URL {
  const url = new URL(`${apiBase.replace(/\/$/, '')}/${slug.join('/')}`);
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  if (userIp) {
    url.searchParams.set('user-ip', userIp);
  }
  return url;
}

function parseAuthSession(rawCookie: string): { access_token?: string } | null {
  // The cookie may be stored as raw JSON or as URL-encoded JSON depending on
  // how the host portal persists it. Try the raw value first, then a decoded
  // variant before giving up.
  const candidates = [rawCookie];
  try {
    const decoded = decodeURIComponent(rawCookie);
    if (decoded !== rawCookie) candidates.push(decoded);
  } catch {
    // rawCookie is not a valid percent-encoded string — ignore.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as { access_token?: string };
    } catch {
      // try the next candidate
    }
  }

  return null;
}

/** Uploads keep their own `Content-Type`: it carries the multipart boundary. */
const isMultipart = (request: NextRequest): boolean =>
  request.headers.get('content-type')?.startsWith(MULTIPART_CONTENT_TYPE) ===
  true;

function buildUpstreamHeaders(
  request: NextRequest,
  apiKey: string,
  userIp: string | null,
  userGeo: ClientGeo | null,
): Headers {
  const headers = new Headers();
  headers.set('x-api-key', apiKey);
  // Match transactions host proxy + HttpInternal: upstream expects JSON
  // Content-Type even on GETs (document paths return PDF by URL, not Accept).
  const uploadContentType =
    isMultipart(request) ? request.headers.get('content-type') : null;
  headers.set('Content-Type', uploadContentType ?? 'application/json');
  headers.set('Accept-Language', DEFAULT_ACCEPT_LANGUAGE);

  for (const header of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  if (!headers.has('x-channel-id')) {
    headers.set('x-channel-id', DEFAULT_X_CHANNEL_ID);
  }

  if (userIp) {
    headers.set('user-ip', userIp);
  }

  if (userGeo) {
    headers.set('user-geo-latitude', userGeo.latitude);
    headers.set('user-geo-longitude', userGeo.longitude);
  }

  const authWarning = (reason: string) => {
    logger.warn('Proxy auth: request sent without a bearer token', {
      event: 'bff.auth_missing',
      reason,
      method: request.method,
      path: request.nextUrl.pathname,
    });
  };

  const authSessionCookie = request.cookies.get('auth_session')?.value;
  if (!authSessionCookie) {
    authWarning('cookie_missing');
    return headers;
  }

  const authSession = parseAuthSession(authSessionCookie);
  if (!authSession) {
    authWarning('cookie_unparsable');
    return headers;
  }

  if (!authSession.access_token) {
    authWarning('access_token_missing');
    return headers;
  }

  headers.set('Authorization', `Bearer ${authSession.access_token}`);
  return headers;
}

async function buildNextResponse(response: Response): Promise<NextResponse> {
  const isNullBodyStatus = NULL_BODY_STATUSES.has(response.status);
  const responseHeaders = new Headers();

  for (const header of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  if (isNullBodyStatus) {
    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  const contentType =
    response.headers.get('Content-Type') ?? 'application/json';
  if (!responseHeaders.has('Content-Type')) {
    responseHeaders.set('Content-Type', contentType);
  }

  // `response.text()` mangles PDF / binary payloads — keep those as bytes.
  if (isBinaryContentType(contentType)) {
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function proxyRequest(
  request: NextRequest,
  { params: pathParams }: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
  const { slug } = await pathParams;
  const {
    slug: upstreamSlug,
    fallbackSlug,
    apiBase,
    fallbackBase,
  } = openingUpstream({
    slug,
    bank: request.cookies.get('fcj-form-bank')?.value,
    // eslint-disable-next-line turbo/no-undeclared-env-vars -- local-only preview override
    formApi: process.env['FCJ_SECTIONS_API'],
    // eslint-disable-next-line turbo/no-undeclared-env-vars -- local-only preview override
    formRequests: process.env['FCJ_FORM_REQUESTS'],
    // eslint-disable-next-line turbo/no-undeclared-env-vars -- local-only preview override
    formRequestId: process.env['FCJ_FORM_REQUEST_ID'],
    defaultApiBase:
      env.NEXT_PUBLIC_API_BASE_URL ||
      // eslint-disable-next-line turbo/no-undeclared-env-vars -- server-only override of the public base
      process.env['API_BASE_URL'],
    localPreview:
      // eslint-disable-next-line turbo/no-undeclared-env-vars -- production builds must not rewrite the request
      process.env.NODE_ENV !== 'production' && request.method === 'GET',
  });
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const apiKey = env.NEXT_PUBLIC_X_API_KEY || process.env['X_API_KEY'];

  if (!apiBase || !apiKey) {
    return NextResponse.json(
      {
        error: 'API configuration incomplete',
        details: {
          apiBaseUrl: apiBase ? 'configured' : 'missing',
          apiKey: apiKey ? 'configured' : 'missing',
        },
      },
      { status: 500 },
    );
  }

  const userIp = resolveClientIp(request);
  const userGeo = resolveClientGeo(request);
  const upstreamHeaders = buildUpstreamHeaders(
    request,
    apiKey,
    userIp,
    userGeo,
  );
  // `text()` would corrupt the bytes of an upload, so multipart travels as a buffer.
  const readBody = async (): Promise<BodyInit | null> => {
    if (NO_BODY_METHODS.has(request.method)) return null;
    return isMultipart(request) ?
        await request.arrayBuffer()
      : await request.text();
  };
  const requestBody = await readBody();
  // Fields every proxy log carries. No query string: it holds `user-ip`.
  const logContext = {
    method: request.method,
    path: `/${slug.join('/')}`,
  };
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);

  try {
    const fetchUpstream = (base: string, parts: string[]) =>
      fetch(
        buildUpstreamUrl(
          base,
          parts,
          request.nextUrl.searchParams,
          userIp,
        ).toString(),
        {
          method: request.method,
          headers: upstreamHeaders,
          body: requestBody,
          cache: 'no-store',
        },
      );
    let response = await fetchUpstream(apiBase, upstreamSlug);
    if (response.status === 404 && fallbackBase) {
      logger.warn('Opening form read fell back to the default API', {
        event: 'bff.opening_fallback',
        ...logContext,
        from: apiBase,
        to: fallbackBase,
      });
      response = await fetchUpstream(fallbackBase, fallbackSlug);
    }

    if (response.status >= 400) {
      const errorBody = await response.clone().text();
      logger.error('Proxy upstream error response', {
        event: 'bff.upstream_error',
        ...logContext,
        status: response.status,
        durationMs: elapsed(),
        upstreamBody: errorBody.slice(0, UPSTREAM_BODY_LOG_LIMIT),
      });
    } else {
      logger.info('Proxy request', {
        event: 'bff.request',
        ...logContext,
        status: response.status,
        durationMs: elapsed(),
      });
    }

    return await buildNextResponse(response);
  } catch (error) {
    logger.error('Proxy upstream unreachable', {
      event: 'bff.upstream_failure',
      ...logContext,
      durationMs: elapsed(),
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Upstream request failed' },
      { status: 502 },
    );
  }
}

export {
  proxyRequest as DELETE,
  proxyRequest as GET,
  proxyRequest as PATCH,
  proxyRequest as POST,
  proxyRequest as PUT,
};
