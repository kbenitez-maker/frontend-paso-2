import type { FieldDefinition } from '@/contracts/types';

import { describe, expect, it } from 'vitest';

import { fieldOf } from '@/test/form';

import { duplicateOf, knownPersonOf } from '../lib/person-identity';

const of = (collection: string, prefix: string): FieldDefinition[] =>
  ['id_type', 'id_number', 'first_name', 'birth_date'].map((name) =>
    fieldOf('string', {
      key: `${prefix}_${name}`,
      collection,
      person_field: name,
      ...(name.startsWith('id_') && { identity: true as const }),
      ...(name === 'first_name' && { item_title: true as const }),
    }),
  );
const admins = of('administrators', 'admin');
const holders = of('shareholders', 'holder');

describe('person identity', () => {
  it('stays off while the collection declares no identity', () => {
    const plain = [fieldOf('string', { key: 'alias', collection: 'accounts' })];
    expect(duplicateOf(plain, { alias: 'a' }, [{ alias: 'a' }], 1)).toBe(
      undefined,
    );
  });

  it('finds the same person in the list by type and number, not by itself', () => {
    const saved = [{ admin_id_type: 'cc', admin_id_number: '001' }];
    const draft = { admin_id_type: 'CC ', admin_id_number: '001' };
    expect(duplicateOf(admins, draft, saved, 1)).toBe(0);
    expect(duplicateOf(admins, draft, saved, 0)).toBe(undefined);
    expect(
      duplicateOf(admins, { admin_id_number: '001' }, saved, 1),
    ).toBeUndefined();
  });

  it('inherits what another collection already holds for the person', () => {
    const scope = {
      administrators: [
        {
          admin_id_type: 'cc',
          admin_id_number: '001',
          admin_first_name: 'Ana',
        },
      ],
    };
    const draft = { holder_id_type: 'cc', holder_id_number: '001' };
    expect(
      knownPersonOf('shareholders', holders, draft, scope, admins),
    ).toEqual({
      collection: 'administrators',
      name: 'Ana',
      inherited: { holder_first_name: 'Ana' },
    });
  });
});
