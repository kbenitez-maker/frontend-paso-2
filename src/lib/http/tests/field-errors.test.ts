import { describe, expect, it } from 'vitest';

import { HttpException } from '@lafise/lde-web-lib';

import { fieldErrorsOf } from '../field-errors';

const rejection = (status: number, data: unknown) =>
  HttpException.fromResponseData(status, {
    error: { code: 'REQUIRED_FIELD_MISSING', message: 'Invalid', data },
  });

describe('fieldErrorsOf', () => {
  it('reads the field errors of a 422 from the error payload', () => {
    const error = rejection(422, {
      field_errors: [
        { field: 'legal_name', code: 'required', message: 'Required' },
        { nonsense: true },
      ],
    });

    expect(fieldErrorsOf(error)).toEqual([
      { field: 'legal_name', code: 'required', message: 'Required' },
    ]);
  });

  it('ignores other statuses, other errors and payloads without the list', () => {
    expect(fieldErrorsOf(rejection(500, { field_errors: [] }))).toEqual([]);
    expect(fieldErrorsOf(rejection(422, { other: 1 }))).toEqual([]);
    expect(fieldErrorsOf(new Error('boom'))).toEqual([]);
  });
});
