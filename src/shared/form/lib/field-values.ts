import type { PhoneValue } from '@/contracts/types';

import { isRecord } from '@/contracts/visibility';

/** Narrowing of the untyped values a form holds; anything else reads as "not answered". */

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const asStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ?
    value
  : undefined;

const asPhone = (value: unknown): PhoneValue | undefined =>
  (
    isRecord(value) &&
    typeof value['dial_code'] === 'string' &&
    typeof value['number'] === 'string'
  ) ?
    { dial_code: value['dial_code'], number: value['number'] }
  : undefined;

export { asBoolean, asNumber, asPhone, asString, asStrings };
