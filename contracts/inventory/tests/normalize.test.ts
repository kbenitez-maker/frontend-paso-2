import type { RawSheet } from '../normalize';
import type { Overlay, OverlayField, Snapshot } from '../schema';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { emitOverlay } from '../emit';
import { normalizeSheet } from '../normalize';
import { buildOutputs } from '../outputs';
import { resolveOverlay } from '../resolve';

const HEADER = [
  'Nombre del campo',
  'Tipo de dato',
  'BLHN',
  'BLRD',
  'Categoría',
  'Visibilidad \nBLRD',
  'Visibilidad \nBLHN',
  'Información\nComplementaria',
];

const sheet: RawSheet = {
  name: 'Demo',
  header: HEADER,
  rows: [
    { number: 2, cells: ['Datos generales ', '', null, null, '', '', '', ''] },
    {
      number: 3,
      cells: [
        'Razón  social',
        'Texto',
        true,
        false,
        'Individual',
        'Siempre Visible',
        'Visible Siempre',
        '',
      ],
    },
    {
      number: 4,
      cells: ['Pagos [Inicio]', 'Colección', true, true, '', '', '', ''],
    },
    {
      number: 5,
      cells: [
        'Monto',
        'Decimal',
        false,
        true,
        '',
        'Si Country == DO',
        '',
        'Nota',
      ],
    },
    {
      number: 6,
      cells: ['Pagos [fin]', 'Colección', true, true, '', '', '', ''],
    },
    {
      number: 7,
      cells: ['Estado', 'Catálogo', true, true, '', 'Siempre visible', '', ''],
    },
  ],
};

describe('normalizeSheet', () => {
  const rows = normalizeSheet(sheet);

  it('treats rows without a type as section headers, not rows', () => {
    expect(rows.map((row) => row.row)).toEqual([3, 4, 5, 6, 7]);
    expect(rows[0]?.section_header).toBe('Datos generales');
  });

  it('brackets collections case-insensitively', () => {
    expect(rows.map((row) => row.collection)).toEqual([
      null,
      'Pagos',
      'Pagos',
      'Pagos',
      null,
    ]);
  });

  it('binds country columns by header name and maps BLRD to DO', () => {
    expect(rows[0]?.countries).toEqual({
      HN: { applies: true, visibility: 'always' },
      DO: { applies: false, visibility: 'always' },
    });
    expect(rows[2]?.countries.DO).toEqual({
      applies: true,
      visibility: 'Si Country == DO',
    });
  });

  it('normalizes types, whitespace and empty cells', () => {
    expect(rows[0]).toMatchObject({
      label: 'Razón social',
      normalized_type: 'text',
      category: 'Individual',
      notes: null,
    });
    expect(rows[4]?.normalized_type).toBe('catalog');
    expect(rows[2]?.notes).toBe('Nota');
  });

  it('rejects unknown data types', () => {
    expect(() =>
      normalizeSheet({
        ...sheet,
        rows: [
          { number: 2, cells: ['X', 'Inventado', true, true, '', '', '', ''] },
        ],
      }),
    ).toThrow('Unknown data type');
  });
});

describe('resolveOverlay', () => {
  const snapshot: Snapshot = { rows: normalizeSheet(sheet) };
  const base = {
    tab: 'Demo',
    key: 'legal_name',
    section: 'identification',
    block: 'identification',
    type: 'string',
    required: 'when_visible',
  } as const;

  it('reports unmapped rows, unknown labels and unknown references', () => {
    const overlay: Overlay = {
      tabs: ['Demo'],
      name: 'company',
      entries: [
        {
          ...base,
          label: 'Razón social',
          visible_when: { field: 'nope', eq: true },
        },
        { ...base, label: 'Inexistente', key: 'other' },
      ],
    };

    expect(resolveOverlay(overlay, snapshot).errors).toEqual([
      'Overlay label not in snapshot: "Inexistente"',
      'Unmapped snapshot row Demo/5: "Monto"',
      'Unmapped snapshot row Demo/7: "Estado"',
      'identification/legal_name: references unknown field "nope"',
    ]);
  });

  it('accepts an overlay with no entries yet', () => {
    const overlay: Overlay = { tabs: ['Demo'], name: 'bancanet', entries: [] };

    expect(resolveOverlay(overlay, snapshot)).toEqual({
      fields: [],
      errors: [],
    });
  });

  it('rejects unknown tabs, blocks of another step and invalid section keys', () => {
    const overlay: Overlay = {
      tabs: ['Demo', 'Missing'],
      name: 'bancanet',
      entries: [
        { ...base, label: 'Razón social', section: 'Identification' },
        { ...base, tab: 'Other', label: 'Monto', key: 'amount' },
        { tab: 'Demo', label: 'Monto', ignore: true, reason: 'test' },
        { tab: 'Demo', label: 'Estado', ignore: true, reason: 'test' },
      ],
    };

    expect(resolveOverlay(overlay, snapshot).errors).toEqual([
      'Tab "Missing" is not in the snapshot',
      'Tab "Other" is not listed in the overlay: "Monto"',
      'Identification/legal_name: section must be kebab-case and differ from the step slug',
      'Identification/legal_name: block "identification" is not a block of bancanet',
    ]);
  });

  it('tells apart rows with the same label by the row hint', () => {
    const [first] = snapshot.rows;
    if (first === undefined) throw new Error('fixture has no rows');
    const duplicated: Snapshot = {
      rows: [...snapshot.rows, { ...first, row: 9 }],
    };
    const ignored = [
      { tab: 'Demo', label: 'Monto', ignore: true, reason: 'test' },
      { tab: 'Demo', label: 'Estado', ignore: true, reason: 'test' },
    ] as const;
    const overlay = (row?: number): Overlay => ({
      tabs: ['Demo'],
      name: 'company',
      entries: [
        { ...base, label: 'Razón social', row: 3 },
        {
          tab: 'Demo',
          label: 'Razón social',
          ignore: true,
          reason: 'dup',
          ...(row !== undefined && { row }),
        },
        ...ignored,
      ],
    });

    expect(resolveOverlay(overlay(9), duplicated).errors).toEqual([]);
    expect(resolveOverlay(overlay(), duplicated).errors).toContain(
      'Overlay label is ambiguous (add section_header or row): "Razón social"',
    );
  });

  it('lets collection fields reference sibling fields, not the other way round', () => {
    const amount = {
      ...base,
      label: 'Monto',
      key: 'amount',
      type: 'decimal',
      collection: 'payments',
    } as const;
    const overlay = (sectionReadsItem: boolean): Overlay => ({
      tabs: ['Demo'],
      name: 'company',
      entries: [
        { ...base, label: 'Razón social' },
        { ...amount, visible_when: { field: 'amount', gte: 1 } },
        {
          ...base,
          label: 'Estado',
          key: 'status',
          ...(sectionReadsItem && {
            visible_when: { field: 'amount', gte: 1 },
          }),
        },
      ],
    });

    expect(resolveOverlay(overlay(false), snapshot).errors).toEqual([]);
    expect(resolveOverlay(overlay(true), snapshot).errors).toEqual([
      'identification/status: conditions may reference section fields or fields of the same collection item (or its parent item) only',
    ]);
  });

  it('carries preload_from and read_only into the resolved field', () => {
    const overlay: Overlay = {
      tabs: ['Demo'],
      name: 'company',
      entries: [
        {
          ...base,
          label: 'Razón social',
          preload_from: 'legal_name',
          read_only: true,
        },
      ],
    };

    expect(
      resolveOverlay(overlay, snapshot).fields.find(
        (field) => field.key === 'legal_name',
      ),
    ).toMatchObject({ preload_from: 'legal_name', read_only: true });
  });
});

describe('nested collections', () => {
  const nested: RawSheet = {
    name: 'Demo',
    header: HEADER,
    rows: (
      [
        ['Cuentas [Inicio]', 'Colección'],
        ['Tipo', 'Catálogo'],
        ['Tarjetas [Inicio]', 'Colección'],
        ['Titular', 'Texto'],
        ['Tarjetas [Fin]', 'Colección'],
        ['Cuentas [Fin]', 'Colección'],
      ] as const
    ).map(([label, type], index) => ({
      number: index + 2,
      cells: [label, type, true, true, '', '', '', ''],
    })),
  };
  const snapshot: Snapshot = { rows: normalizeSheet(nested) };
  const field = {
    tab: 'Demo',
    section: 'accounts-info',
    block: 'identification',
    required: 'when_visible',
  } as const;
  const kind: OverlayField = {
    ...field,
    label: 'Tipo',
    key: 'kind',
    type: 'catalog',
    catalog: { name: 'kinds', source: 'unknown' },
    collection: 'accounts',
  };
  const holder: OverlayField = {
    ...field,
    label: 'Titular',
    key: 'holder',
    type: 'string',
    collection: 'cards',
    visible_when: { field: 'kind', eq: 'checking' },
  };
  const overlay = (extra: Partial<Overlay> = {}): Overlay => ({
    tabs: ['Demo'],
    name: 'company',
    entries: [kind, holder],
    collections: {
      accounts: { min_items: 1 },
      cards: { parent: 'accounts', min_items: 1, max_items: 2 },
    },
    ...extra,
  });

  it('records the sheet path of nested collections', () => {
    expect(snapshot.rows.map((row) => row.collection)).toContain(
      'Cuentas > Tarjetas',
    );
  });

  it('carries the parent and the child limits onto the child fields', () => {
    const { fields, errors } = resolveOverlay(overlay(), snapshot);

    expect(errors).toEqual([]);
    expect(fields.find((entry) => entry.key === 'holder')).toMatchObject({
      collection: 'cards',
      parent_collection: 'accounts',
      min_items: 1,
      max_items: 2,
    });
  });

  it('emits the child array inside the parent item DTO and the samples', async () => {
    const { fields } = resolveOverlay(overlay(), snapshot);
    const files = await emitOverlay('company', fields);
    const contract = files.get('src/contracts/generated/company.ts') ?? '';

    expect(contract).toMatch(
      /interface AccountsItemDto \{\n {2}kind\?: string;\n {2}cards\?: CardsItemDto\[\];\n\}/,
    );
    expect(contract).toMatch(
      /interface AccountsInfoDto \{\n {2}accounts\?: AccountsItemDto\[\];\n\}/,
    );
    expect(files.get('test/fixtures/generated/company.ts')).toMatch(
      /cards: \[\s*\{\s*holder: 'sample-holder',\s*\},?\s*\]/,
    );
  });

  it('carries min_items_when_any onto the item fields and checks what it reads', () => {
    const when = {
      item: { field: 'holder', eq: 'joint' },
      min: 2,
      message_key: 'joint_signers',
    } as const;
    const { fields, errors } = resolveOverlay(
      overlay({
        collections: {
          accounts: { min_items: 1 },
          cards: { parent: 'accounts', min_items_when_any: when },
        },
      }),
      snapshot,
    );

    expect(errors).toEqual([]);
    expect(fields.find((entry) => entry.key === 'holder')).toMatchObject({
      min_items_when_any: when,
    });
    expect(
      resolveOverlay(
        overlay({
          collections: {
            accounts: { min_items: 1 },
            cards: {
              parent: 'accounts',
              min_items_when_any: { ...when, item: { field: 'kind', eq: 1 } },
            },
          },
        }),
        snapshot,
      ).errors,
    ).toEqual([
      'Collection "cards": min_items_when_any may only read fields of its items',
    ]);
  });

  it('lets validation rules, not conditions, read fields of other overlays', () => {
    const { visible_when: _condition, ...plain } = holder;
    const reading = (extra: Partial<OverlayField>) =>
      overlay({ entries: [kind, { ...plain, ...extra }] });
    const foreign = new Set(['annual_sales_usd']);

    expect(
      resolveOverlay(
        reading({
          validation: [{ lte_field: 'annual_sales_usd', message_key: 'x' }],
        }),
        snapshot,
        foreign,
      ).errors,
    ).toEqual([]);
    expect(
      resolveOverlay(
        reading({ visible_when: { field: 'annual_sales_usd', eq: 1 } }),
        snapshot,
        foreign,
      ).errors,
    ).toEqual([
      'accounts-info/holder: references unknown field "annual_sales_usd"',
    ]);
  });

  it('rejects an undeclared parent and more than one nesting level', () => {
    expect(
      resolveOverlay(overlay({ collections: {} }), snapshot).errors,
    ).toEqual([
      'accounts-info/holder: collection "Cuentas > Tarjetas" is named inconsistently',
      'accounts-info/holder: conditions may reference section fields or fields of the same collection item (or its parent item) only',
    ]);
    expect(
      resolveOverlay(
        overlay({
          collections: {
            accounts: { parent: 'cards' },
            cards: { parent: 'accounts' },
          },
        }),
        snapshot,
      ).errors,
    ).toEqual([
      'accounts-info/kind: collection must match the snapshot (Cuentas)',
      'Collection "accounts": parent "cards" must be a top-level collection of company',
      'Collection "cards": parent "accounts" must be a top-level collection of company',
    ]);
  });

  it('carries the item layout onto the fields and the child collection fields', () => {
    const { fields, errors } = resolveOverlay(
      {
        ...overlay(),
        entries: [
          {
            ...kind,
            item_tab: 'setup',
            item_group: 'general',
            item_title: true,
          },
          holder,
        ],
        collections: {
          accounts: { min_items: 1 },
          cards: { parent: 'accounts', item_tab: 'cards', item_group: 'cards' },
        },
      },
      snapshot,
    );

    expect(errors).toEqual([]);
    expect(
      fields.map(({ key, item_tab, item_group, item_title }) => ({
        key,
        item_tab,
        item_group,
        item_title,
      })),
    ).toEqual([
      {
        key: 'kind',
        item_tab: 'setup',
        item_group: 'general',
        item_title: true,
      },
      {
        key: 'holder',
        item_tab: 'cards',
        item_group: 'cards',
        item_title: undefined,
      },
    ]);
  });

  it('accepts own fields without a tab in a tabbed collection (rendered above the tabs)', () => {
    const { errors } = resolveOverlay(
      {
        ...overlay(),
        entries: [kind, holder],
        collections: {
          accounts: { min_items: 1 },
          cards: { parent: 'accounts', item_tab: 'cards' },
        },
      },
      snapshot,
    );

    expect(errors).toEqual([]);
  });

  it('rejects a child list without a tab and item layout outside a top-level collection', () => {
    const errorsOf = (extra: Partial<Overlay>) =>
      resolveOverlay(overlay(extra), snapshot).errors;

    expect(
      errorsOf({
        entries: [{ ...kind, item_tab: 'setup' }, holder],
      }),
    ).toEqual([
      'Collection "cards": needs collections.cards.item_tab, "accounts" has tabs',
    ]);
    expect(
      errorsOf({
        entries: [
          kind,
          {
            ...holder,
            item_tab: 'cards',
            item_group: 'cards',
            item_title: true,
          },
        ],
        collections: {
          accounts: { item_tab: 'setup' },
          cards: { parent: 'accounts' },
        },
      }),
    ).toEqual([
      'accounts-info/holder: item_tab requires a top-level collection (child collections take collections.<key>.item_tab)',
      'accounts-info/holder: item_group requires a top-level collection (child collections take collections.<key>.item_group)',
      'accounts-info/holder: item_title requires a top-level collection',
      'Collection "accounts": item_tab and item_group are for child collections; top-level fields set their own',
    ]);
  });

  it('lets a regrouped field leave the sheet nesting only with a note', () => {
    // "Tipo" sits in the sheet's "Cuentas"; regrouped, it may move out of the collection.
    const moved = (note?: string): Overlay =>
      overlay({
        entries: [
          {
            ...field,
            label: 'Tipo',
            key: 'kind',
            type: 'string',
            regrouped: true,
            ...(note === undefined ? {} : { note }),
          },
          {
            tab: 'Demo',
            label: 'Titular',
            ignore: true,
            reason: 'Not under test',
          },
        ],
        collections: {},
      });

    expect(resolveOverlay(moved('POC grouping'), snapshot).errors).toEqual([]);
    expect(resolveOverlay(moved(), snapshot).errors).toEqual([
      'accounts-info/kind: regrouped requires a note saying why',
    ]);
  });
});

describe('buildOutputs', () => {
  it('builds every registered overlay without errors', async () => {
    expect((await buildOutputs()).errors).toEqual([]);
  });

  it('reports an unknown overlay name', async () => {
    expect((await buildOutputs(['nope'])).errors).toEqual([
      'unknown overlay "nope"',
    ]);
  });
});

describe('company overlay', () => {
  it('covers every typed row of the committed snapshot', async () => {
    const { errors, files } = await buildOutputs(['company']);

    expect(errors).toEqual([]);
    expect([...files.keys()]).toEqual([
      'src/contracts/generated/company.ts',
      'test/fixtures/generated/company.ts',
      'i18n/es/company-fields.json',
      'i18n/en/company-fields.json',
    ]);
  });

  it('emits the profiling preload mapping and the read-only flags in the registry', async () => {
    const { files } = await buildOutputs();
    const registry = files.get('src/contracts/generated/company.ts') ?? '';

    for (const key of [
      'legal_name',
      'legal_entity_type_id',
      'identification_type_id',
      'identification_number',
    ]) {
      expect(registry).toContain(`preload_from: '${key}'`);
    }
    expect(registry.match(/read_only: true/g)).toHaveLength(3);
  });

  it('emits one label per field, one per variant, and falls back to Spanish in English', async () => {
    const { files } = await buildOutputs();
    const labels = (locale: string): Record<string, string> =>
      z
        .object({
          CompanyFields: z.object({ labels: z.record(z.string(), z.string()) }),
        })
        .parse(
          JSON.parse(files.get(`i18n/${locale}/company-fields.json`) ?? '{}'),
        ).CompanyFields.labels;
    const es = labels('es');

    expect(es['legal_name']).toBe('Razón social de la empresa');
    expect(es['lawyer_name_notary']).toBeDefined();
    expect(es['lawyer_name_resident_agent']).toBeDefined();
    expect(es['lawyer_name']).toBeUndefined();
    expect(labels('en')).toEqual(es);
  });
});
