import { describe, expect, it } from 'vitest';

import { ownValueOf } from '../own-key';

const catalogs = { countries: 'countries' } as const;

describe('ownValueOf', () => {
  it('reads an own key of the table', () => {
    expect(ownValueOf({ a: 1 }, 'a')).toBe(1);
    expect(ownValueOf(catalogs, 'countries')).toBe('countries');
  });

  it('keeps a stored zero', () => {
    expect(ownValueOf({ count: 0 }, 'count')).toBe(0);
  });

  it('rejects inherited names and a missing key', () => {
    expect(ownValueOf(catalogs, 'toString')).toBeUndefined();
    expect(ownValueOf(catalogs, 'constructor')).toBeUndefined();
    expect(ownValueOf(catalogs, '__proto__')).toBeUndefined();
    expect(ownValueOf(catalogs, 'missing')).toBeUndefined();
  });
});
