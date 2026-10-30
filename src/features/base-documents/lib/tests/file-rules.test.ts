import { describe, expect, it } from 'vitest';

import {
  acceptedTypesLabel,
  formatBytes,
  isRejection,
  megabytesOf,
  remainingSeconds,
  validateFile,
} from '../file-rules';

const limits = {
  accepted_types: ['application/pdf', 'image/jpeg', 'image/png'],
  max_size_bytes: 25 * 1024 * 1024,
};

describe('validateFile', () => {
  it.each(['application/pdf', 'image/jpeg', 'image/png'])(
    'accepts %s within the limit',
    (type) => {
      expect(validateFile({ size: 1024, type }, limits)).toBeUndefined();
    },
  );

  it('accepts a file of exactly the limit', () => {
    expect(
      validateFile(
        { size: limits.max_size_bytes, type: 'application/pdf' },
        limits,
      ),
    ).toBeUndefined();
  });

  it('rejects a file over the limit', () => {
    expect(
      validateFile(
        { size: limits.max_size_bytes + 1, type: 'application/pdf' },
        limits,
      ),
    ).toBe('size');
  });

  it.each(['text/plain', 'application/zip', 'image/gif', ''])(
    'rejects the format "%s"',
    (type) => {
      expect(validateFile({ size: 10, type }, limits)).toBe('format');
    },
  );

  it('follows the limits of the item, not fixed ones', () => {
    expect(
      validateFile(
        { size: 2048, type: 'image/png' },
        { accepted_types: ['image/png'], max_size_bytes: 1024 },
      ),
    ).toBe('size');
    expect(
      validateFile(
        { size: 10, type: 'application/pdf' },
        { accepted_types: ['image/png'], max_size_bytes: 1024 },
      ),
    ).toBe('format');
  });
});

describe('formatBytes', () => {
  it('uses bytes, kilobytes and megabytes', () => {
    expect(formatBytes(10)).toBe('10 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(5 * 1024 + 300)).toBe('5 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });

  it('never shows a small file as "0 KB"', () => {
    expect(formatBytes(200)).toBe('200 B');
  });
});

describe('megabytesOf', () => {
  it('states the limit in whole megabytes', () => {
    expect(megabytesOf(limits.max_size_bytes)).toBe(25);
  });
});

describe('remainingSeconds', () => {
  it('extrapolates from the real rate', () => {
    expect(remainingSeconds(2000, 0.5)).toBe(2);
    expect(remainingSeconds(1000, 0.25)).toBe(3);
  });

  it('has no estimate before anything was sent', () => {
    expect(remainingSeconds(500, 0)).toBeUndefined();
  });

  it('is zero when done', () => {
    expect(remainingSeconds(4000, 1)).toBe(0);
  });
});

describe('acceptedTypesLabel', () => {
  it('names the formats the way the copy does', () => {
    expect(acceptedTypesLabel(limits.accepted_types, 'es')).toBe(
      'PDF, JPG o PNG',
    );
    expect(acceptedTypesLabel(['application/pdf'], 'es')).toBe('PDF');
  });

  it('keeps an unknown MIME type as it is', () => {
    expect(acceptedTypesLabel(['application/zip'], 'es')).toBe(
      'application/zip',
    );
  });
});

describe('isRejection', () => {
  it('recognizes the format and size refusals', () => {
    expect(isRejection(415)).toBe(true);
    expect(isRejection(413)).toBe(true);
    expect(isRejection(500)).toBe(false);
    expect(isRejection(422)).toBe(false);
  });
});
