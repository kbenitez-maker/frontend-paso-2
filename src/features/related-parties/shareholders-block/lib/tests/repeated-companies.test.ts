import type { Party } from '@/lib/ownership';

import { describe, expect, it } from 'vitest';

import { repeatedCompanies } from '../repeated-companies';

const party = (overrides: Partial<Party>): Party => ({
  id: '0',
  parent: 'holder',
  percentage: 10,
  natural: false,
  legal: true,
  document: '',
  name: '',
  listed: false,
  minority: 0,
  ...overrides,
});

describe('repeatedCompanies', () => {
  it('names a company registered twice under the same document, once', () => {
    const parties = [
      party({ id: '0', document: 'ruc|1', name: 'Acme' }),
      party({ id: '1', document: 'ruc|1', name: 'Acme' }),
      party({ id: '2', document: 'ruc|2', name: 'Solo' }),
    ];

    expect(repeatedCompanies(parties)).toEqual(['Acme']);
  });

  it('ignores people, parties without a document and unique companies', () => {
    const parties = [
      party({ id: '0', legal: false, natural: true, document: 'id|1' }),
      party({ id: '1', legal: false, natural: true, document: 'id|1' }),
      party({ id: '2', document: '', name: 'No document' }),
      party({ id: '3', document: '', name: 'No document either' }),
    ];

    expect(repeatedCompanies(parties)).toEqual([]);
  });
});
