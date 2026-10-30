import { describe, expect, it } from 'vitest';

import { bodyOf, identificationOf, schemaOf } from '../lib/profile-schema';

const valid = {
  identification_type_id: 'ruc',
  identification_number: ' J031 ',
  legal_name: ' Empresa S.A. ',
  legal_entity_type_id: 'corporation',
  annual_sales_usd: 1500.5,
  branch_id: 'branch-1',
};

describe('profile schema', () => {
  it('asks only for the identification on the first moment', () => {
    const first = schemaOf('identify');

    expect(
      first.safeParse({
        identification_type_id: 'ruc',
        identification_number: '1',
      }).success,
    ).toBe(true);
    expect(
      first.safeParse({
        identification_type_id: '',
        identification_number: '1',
      }).success,
    ).toBe(false);
  });

  it('asks for every base field on the second moment', () => {
    const second = schemaOf('base-data');

    expect(second.safeParse(valid).success).toBe(true);
    expect(second.safeParse({ ...valid, branch_id: undefined }).success).toBe(
      false,
    );
    expect(second.safeParse({ ...valid, legal_name: '  ' }).success).toBe(
      false,
    );
  });

  it('rejects annual sales that are not a positive amount', () => {
    expect(bodyOf({ ...valid, annual_sales_usd: 0 })).toBeUndefined();
    expect(bodyOf({ ...valid, annual_sales_usd: undefined })).toBeUndefined();
  });

  it('builds the request body with trimmed texts', () => {
    expect(bodyOf(valid)).toEqual({
      ...valid,
      identification_number: 'J031',
      legal_name: 'Empresa S.A.',
    });
  });

  it('builds the lookup body from the identification only', () => {
    expect(identificationOf(valid)).toEqual({
      identification_type_id: 'ruc',
      identification_number: 'J031',
    });
    expect(identificationOf({ identification_type_id: 'ruc' })).toBeUndefined();
  });
});
