import { describe, expect, it } from 'vitest';

import { blockFieldsOf, blockItems, dependentsOf } from '../block-fields';
import { draftValues } from '../block-validation';
import { contextOf, normalizeValues, sectionBody } from '../block-values';

describe('block fields', () => {
  it('collects the fields of a block for a country with their section', () => {
    const fields = blockFieldsOf('company', 'address', 'PA');

    expect(fields.map((entry) => entry.field.key)).toContain('subdistrict_id');
    expect(fields.every((entry) => entry.section === 'location')).toBe(true);
    expect(
      blockFieldsOf('company', 'address', 'NI').some(
        (entry) => entry.field.key === 'subdistrict_id',
      ),
    ).toBe(false);
  });

  it('groups collection fields into one item', () => {
    const items = blockItems(blockFieldsOf('company', 'tax-residence', 'PA'));

    expect(items.map((item) => item.kind)).toEqual(['field', 'collection']);
  });

  it('follows catalog parents transitively', () => {
    expect(
      dependentsOf(
        blockFieldsOf('company', 'address', 'PA'),
        'province_id',
        'PA',
      ),
    ).toEqual(['district_id', 'subdistrict_id']);
  });

  it('follows the catalog parent of the country', () => {
    const fields = blockFieldsOf('company', 'address', 'CR');

    expect(dependentsOf(fields, 'province_id', 'CR')).toEqual([
      'canton_id',
      'district_id',
    ]);
    expect(
      dependentsOf(
        blockFieldsOf('company', 'address', 'DO'),
        'province_id',
        'DO',
      ),
    ).toEqual(['municipality_id', 'sector_id']);
  });
});

describe('normalizeValues in collections', () => {
  it('drops item fields hidden by a sibling answer of the same item', () => {
    const fields = blockFieldsOf('bancanet', 'superusers', 'NI');
    const values = normalizeValues(
      fields,
      {
        superusers: [
          {
            assign_registered_signatory: true,
            registered_signatory_id: 'p1',
            first_name: 'Ana',
          },
          { assign_registered_signatory: false, first_name: 'Luis' },
        ],
      },
      {},
      'NI',
    );

    expect(values['superusers']).toEqual([
      { assign_registered_signatory: true, registered_signatory_id: 'p1' },
      { assign_registered_signatory: false, first_name: 'Luis' },
    ]);
  });
});

describe('normalizeValues in child collections', () => {
  const fields = blockFieldsOf('references-accounts', 'accounts', 'CR');

  it('groups child collection fields into their parent collection', () => {
    const items = blockItems(fields).filter(
      (item) => item.kind === 'collection',
    );

    expect(items.map((item) => item.name)).toEqual(['accounts']);
  });

  it('prunes child items by their own and their parent item answers', () => {
    const card = {
      card_for_related_party: false,
      card_related_party_ids: ['rp-1'],
      card_first_name: 'Ana',
      card_middle_name: '',
    };
    const values = normalizeValues(
      fields,
      {
        accounts: [
          { wants_debit_card: true, additional_cards: [card] },
          { wants_debit_card: false, additional_cards: [card] },
        ],
      },
      {},
      'CR',
    );

    expect(values['accounts']).toEqual([
      {
        wants_debit_card: true,
        additional_cards: [
          { card_for_related_party: false, card_first_name: 'Ana' },
        ],
      },
      { wants_debit_card: false },
    ]);
  });

  it('leaves out of a draft only the child values that fail their format', () => {
    const values = {
      accounts: [
        {
          wants_debit_card: true,
          additional_cards: [
            { card_for_related_party: false, card_first_name: 7 },
            { card_for_related_party: false, card_first_name: 'Luis' },
          ],
        },
      ],
    };

    expect(draftValues(fields, values, {}, 'CR')).toEqual({
      accounts: [
        {
          wants_debit_card: true,
          additional_cards: [
            { card_for_related_party: false },
            { card_for_related_party: false, card_first_name: 'Luis' },
          ],
        },
      ],
    });
  });
});

describe('normalizeValues', () => {
  const fields = blockFieldsOf('company', 'branches', 'PA');
  const context = { address_country_id: 'PA' };

  it('drops blanks and answers of fields that are hidden', () => {
    const values = normalizeValues(
      fields,
      {
        has_additional_branches: undefined,
        in_free_trade_zone: false,
        free_zone_id: 'colon-free-zone',
        free_zone_name: '',
      },
      context,
      'PA',
    );

    expect(values).toEqual({ in_free_trade_zone: false });
  });

  it('keeps a follow-up while its trigger holds', () => {
    const values = normalizeValues(
      fields,
      { in_free_trade_zone: true, free_zone_id: 'colon-free-zone' },
      context,
      'PA',
    );

    expect(values).toEqual({
      in_free_trade_zone: true,
      free_zone_id: 'colon-free-zone',
    });
  });
});

describe('section bodies', () => {
  const fields = blockFieldsOf('company', 'branches', 'PA');

  it('replaces the block keys and keeps what other blocks saved', () => {
    const body = sectionBody(
      'location',
      fields,
      { location: { street: 'x', in_free_trade_zone: true } },
      { in_free_trade_zone: false },
    );

    expect(body).toEqual({ street: 'x', in_free_trade_zone: false });
  });

  it('leaves out of the context what the block owns', () => {
    expect(
      contextOf(
        { location: { in_free_trade_zone: true, street: 'x' } },
        fields,
      ),
    ).toEqual({ street: 'x' });
  });
});

describe('draftValues', () => {
  it('leaves out values that fail format checks but tolerates missing ones', () => {
    const fields = blockFieldsOf('company', 'contact', 'PA');

    expect(
      draftValues(
        fields,
        { company_email: 'nope', website_url: 'https://example.com' },
        {},
        'PA',
      ),
    ).toEqual({ website_url: 'https://example.com' });
  });
});
