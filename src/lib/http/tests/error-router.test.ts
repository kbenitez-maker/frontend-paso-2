import { describe, expect, it } from 'vitest';

import {
  classifyBackendError,
  shouldRouteQueryErrorToPage,
} from '../error-router';
import { BackendErrorKind } from '../types';

const httpError = (status: number) => ({ type: 'HTTP_ERROR', status });

describe('classifyBackendError', () => {
  it.each([
    [401, BackendErrorKind.Unauthorized],
    [403, BackendErrorKind.Forbidden],
    [404, BackendErrorKind.NotFound],
    [500, BackendErrorKind.Internal],
    [422, BackendErrorKind.ClientError],
  ])('maps %i', (status, kind) => {
    expect(classifyBackendError(httpError(status))).toEqual({ kind, status });
  });

  it('treats errors without a status as internal', () => {
    expect(classifyBackendError(new Error('boom'))).toEqual({
      kind: BackendErrorKind.Internal,
      status: 0,
    });
  });
});

describe('shouldRouteQueryErrorToPage', () => {
  it('routes 401, 404 and 5xx to the error page', () => {
    expect(shouldRouteQueryErrorToPage(httpError(401))).toBe(true);
    expect(shouldRouteQueryErrorToPage(httpError(404))).toBe(true);
    expect(shouldRouteQueryErrorToPage(httpError(503))).toBe(true);
  });

  it('keeps 403, other 4xx and status-less HTTP errors inline', () => {
    expect(shouldRouteQueryErrorToPage(httpError(403))).toBe(false);
    expect(shouldRouteQueryErrorToPage(httpError(422))).toBe(false);
    expect(shouldRouteQueryErrorToPage({ type: 'HTTP_ERROR' })).toBe(false);
  });

  it('routes non-HTTP errors to the error page', () => {
    expect(shouldRouteQueryErrorToPage(new Error('boom'))).toBe(true);
  });
});
