import { describe, expect, it } from 'vitest';

import { sectionFields } from '@/contracts';

import { itemResolver } from '../lib/item-resolver';

const options = { shouldUseNativeValidation: false, fields: {} };

describe('itemResolver', () => {
  it('keeps only the errors of the edited item, read among the saved items', async () => {
    const fields = sectionFields('trust-administrators');
    const natural = { trust_admin_person_type_id: 'natural' };
    const committee = {
      trust_admin_role_ids: ['technical-committee'],
      trust_admin_committee_position_ids: ['president', 'secretary', 'member'],
    };
    const other = { ...natural, trust_admin_first_name: 'Ana' };
    // A lone committee record also fails a list-level rule: the item's errors survive it.
    const draft = {
      ...natural,
      ...committee,
      trust_admin_first_name: 'Comité técnico',
    };
    const resolve = itemResolver(
      'trust_administrators',
      fields,
      {},
      'NI',
      [other, { trust_admin_first_name: 'Mario' }],
      1,
    );

    const { errors } = await resolve(
      { trust_administrators: [draft] },
      undefined,
      options,
    );

    expect(errors).toMatchObject({
      trust_administrators: [
        { trust_admin_first_name: { message: 'body_name' } },
      ],
    });
  });

  it('checks a shareholder parent against the saved structure (cycle)', async () => {
    const company = (number: string, parent: string) => ({
      shareholder_person_type_id: 'legal',
      shareholder_identification_type_id: 'ruc',
      shareholder_identification_number: number,
      shareholder_parent_company_id: parent,
      shareholder_share_percentage: 100,
    });
    const resolve = itemResolver(
      'shareholders',
      sectionFields('shareholders'),
      {},
      'NI',
      [company('J1', 'holder'), company('J2', 'ruc|j1')],
      0,
    );

    const { errors } = await resolve(
      { shareholders: [company('J1', 'ruc|j2')] },
      undefined,
      options,
    );

    expect(errors).toMatchObject({
      shareholders: [
        { shareholder_parent_company_id: { message: 'ownership_cycle' } },
      ],
    });
  });
});
