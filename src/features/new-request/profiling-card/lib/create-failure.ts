import { HttpException } from '@lafise/lde-web-lib';

/** The bank's catalog does not offer the identification type that was sent. */
const IDENTIFICATION_TYPE_UNAVAILABLE = 'FCJ005';

const isIdentificationTypeRejected = (error: unknown): boolean =>
  error instanceof HttpException &&
  error.error.code === IDENTIFICATION_TYPE_UNAVAILABLE;

export { isIdentificationTypeRejected };
