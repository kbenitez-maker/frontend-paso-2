import { describe, expect, it } from 'vitest';

import { isRequestId } from '../request-id';

describe('isRequestId', () => {
  it('accepts UUIDs', () => {
    expect(isRequestId('0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isRequestId('new')).toBe(false);
    expect(isRequestId('../etc/passwd')).toBe(false);
    expect(isRequestId(42)).toBe(false);
  });
});
