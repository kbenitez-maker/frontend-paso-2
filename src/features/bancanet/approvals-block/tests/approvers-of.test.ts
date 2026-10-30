import { describe, expect, it } from 'vitest';

import { approversOf } from '../lib/approvers-of';

describe('approversOf', () => {
  const signatories = [{ code: 'rp-1', name: 'Ana López' }];

  it('lists the saved superusers by catalog code or identification number', () => {
    expect(
      approversOf(
        [
          {
            assign_registered_signatory: true,
            registered_signatory_id: 'rp-1',
          },
          {
            assign_registered_signatory: false,
            first_name: 'Luis',
            first_last_name: 'Pérez',
            identification_number: '001-1',
          },
        ],
        signatories,
      ),
    ).toEqual([
      { code: 'rp-1', name: 'Ana López' },
      { code: '001-1', name: 'Luis Pérez' },
    ]);
  });

  it('skips superusers that cannot be told apart yet', () => {
    expect(approversOf([{ first_name: 'Luis' }, 'junk'], signatories)).toEqual(
      [],
    );
    expect(approversOf(undefined, signatories)).toEqual([]);
  });
});
