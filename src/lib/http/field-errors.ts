import type { FieldError } from '@/types/api-error';

import { HttpException } from '@lafise/lde-web-lib';

const UNPROCESSABLE = 422;

const isFieldError = (value: unknown): value is FieldError =>
  typeof value === 'object' &&
  value !== null &&
  'field' in value &&
  typeof value.field === 'string' &&
  'code' in value &&
  typeof value.code === 'string' &&
  'message' in value &&
  typeof value.message === 'string';

/**
 * Field errors of a rejected section save. `HttpException` keeps extra payload
 * only under `error.data`, so that is where the 422 body carries them.
 */
const fieldErrorsOf = (error: unknown): FieldError[] => {
  if (!(error instanceof HttpException) || error.status !== UNPROCESSABLE) {
    return [];
  }
  const data: unknown = error.error.data;
  const list: unknown =
    typeof data === 'object' && data !== null && 'field_errors' in data ?
      data.field_errors
    : undefined;
  return Array.isArray(list) ? list.filter(isFieldError) : [];
};

export { fieldErrorsOf };
