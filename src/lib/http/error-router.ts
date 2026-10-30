import type { ClassifiedBackendError } from './types';

import { HttpException, StatusCodes } from '@lafise/lde-web-lib';

import { BackendErrorKind } from './types';

/** Duck-types `status` so test doubles that aren't `HttpException` still match. */
const getHttpStatus = (error: unknown): number | undefined => {
  if (error instanceof HttpException) return error.status;
  if (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return undefined;
};

const isHttpStatus = (status: number, code: number): boolean => status === code;

const SERVER_ERROR: number = StatusCodes.INTERNAL_SERVER_ERROR;

const isServerErrorStatus = (status: number): boolean => status >= SERVER_ERROR;

const isHttpErrorShape = (error: unknown): boolean => {
  if (error instanceof HttpException) {
    return true;
  }
  return (
    error !== null &&
    typeof error === 'object' &&
    'type' in error &&
    error.type === 'HTTP_ERROR'
  );
};

/** Full-page: 401, 404, 5xx, non-HTTP. 403 and other 4xx stay inline (use PermissionGuard for 403). */
const shouldRouteQueryErrorToPage = (error: unknown): boolean => {
  if (isHttpErrorShape(error)) {
    const status = getHttpStatus(error);
    if (status === undefined || status === 0) {
      return false;
    }
    return (
      isHttpStatus(status, StatusCodes.UNAUTHORIZED) ||
      isHttpStatus(status, StatusCodes.NOT_FOUND) ||
      isServerErrorStatus(status)
    );
  }
  return true;
};

const classifyBackendError = (error: unknown): ClassifiedBackendError => {
  const status = getHttpStatus(error);
  if (status === undefined) {
    return { kind: BackendErrorKind.Internal, status: 0 };
  }
  if (isHttpStatus(status, StatusCodes.UNAUTHORIZED)) {
    return {
      kind: BackendErrorKind.Unauthorized,
      status: StatusCodes.UNAUTHORIZED,
    };
  }
  if (isHttpStatus(status, StatusCodes.FORBIDDEN)) {
    return {
      kind: BackendErrorKind.Forbidden,
      status: StatusCodes.FORBIDDEN,
    };
  }
  if (isHttpStatus(status, StatusCodes.NOT_FOUND)) {
    return {
      kind: BackendErrorKind.NotFound,
      status: StatusCodes.NOT_FOUND,
    };
  }
  if (isServerErrorStatus(status)) {
    return { kind: BackendErrorKind.Internal, status };
  }
  return { kind: BackendErrorKind.ClientError, status };
};

export { classifyBackendError, shouldRouteQueryErrorToPage };
