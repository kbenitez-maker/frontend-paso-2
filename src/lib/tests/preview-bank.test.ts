import { afterEach, describe, expect, it, vi } from 'vitest';

import { previewBankOf } from '@/lib/opening/preview-bank';

describe('previewBankOf', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts an operating bank code outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(previewBankOf(' blcr ')).toBe('BLCR');
  });

  it('returns undefined in production so the url cannot switch the request', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(previewBankOf('BLCR')).toBeUndefined();
  });
});
