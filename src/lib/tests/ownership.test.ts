// cspell:ignore Solís Sofía beto elena
import type { Party } from '@/lib/ownership';

import { describe, expect, it } from 'vitest';

import {
  administratorsRegistered,
  closesCycle,
  confirmIssue,
  cyclesIn,
  fingerprintOf,
  gateIssue,
  HOLDER,
  isCurrent,
  labelsOf,
  levelOf,
  openBranches,
  owesComplementary,
  OWNERSHIP_CONFIRMATION,
  ownershipTotals,
  partiesOf,
  principalRecordOf,
  remainingIn,
  SHAREHOLDERS,
  unbalancedPoints,
  withoutBeneficialOwner,
} from '@/lib/ownership';

// POC tests ported: lib/relacionados/tests/cierre.test.ts and design/tests/estructura-de-muestra.test.ts.

type Item = Record<string, unknown>;

const natural = (
  parent: string,
  percentage: number,
  first: string,
  last: string,
  number: string,
): Item => ({
  shareholder_person_type_id: 'natural',
  shareholder_parent_company_id: parent,
  shareholder_share_percentage: percentage,
  shareholder_first_name: first,
  shareholder_last_name: last,
  shareholder_identification_type_id: 'national-id',
  shareholder_identification_number: number,
});

const legal = (
  parent: string,
  percentage: number,
  name: string,
  number: string,
): Item => ({
  shareholder_person_type_id: 'legal',
  shareholder_parent_company_id: parent,
  shareholder_share_percentage: percentage,
  shareholder_legal_name: name,
  shareholder_identification_type_id: 'ruc',
  shareholder_identification_number: number,
  shareholder_is_listed: false,
});

const key = (number: string) => `ruc|${number.toLowerCase()}`;

/** POC ESTRUCTURA_DE_MUESTRA: María 60 % direct, Beto 30 % through two links, Carla exactly 10 % through three. */
const SAMPLE: Item[] = [
  natural(HOLDER, 60, 'María', 'Solís', '001-120385-0012C'),
  legal(HOLDER, 40, 'Inversiones Alfa S.A.', 'J0310000012345'),
  natural(key('J0310000012345'), 75, 'Beto', 'Rivas', '001-240779-0003X'),
  legal(key('J0310000012345'), 25, 'Gamma Holding S.A.', 'J0310000067890'),
  natural(key('J0310000067890'), 100, 'Carla', 'Núñez', '401-150592-0008M'),
];

const HOLDINGS = [
  'Holding Uno S.A.',
  'Holding Dos S.A.',
  'Holding Tres S.A.',
  'Holding Cuatro S.A.',
  'Holding Cinco S.A.',
  'Holding Seis S.A.',
  'Holding Siete S.A.',
  'Holding Ocho S.A.',
  'Holding Nueve S.A.',
];
const holdingNumber = (index: number) =>
  `J031000${String(index + 1).padStart(4, '0')}`;

/** POC ESTRUCTURA_PROFUNDA: ten levels. */
const DEEP: Item[] = [
  natural(HOLDER, 10, 'María', 'Solís', '001-120385-0012C'),
  ...HOLDINGS.map((name, index) =>
    legal(
      index === 0 ? HOLDER : key(holdingNumber(index - 1)),
      index === 0 ? 90
      : name === 'Holding Seis S.A.' ? 92
      : 100,
      name,
      holdingNumber(index),
    ),
  ),
  natural(key(holdingNumber(4)), 8, 'Elena', 'Cruz', '001-030690-0021B'),
  natural(key(holdingNumber(8)), 85, 'Ricardo', 'Vega', '001-180572-0044K'),
  natural(key(holdingNumber(8)), 15, 'Sofía', 'Lagos', '401-220894-0077P'),
];

const totalOf = (items: Item[], name: string) =>
  ownershipTotals(partiesOf(items), 10).find((total) =>
    total.name.includes(name),
  );

describe('sample structure (three levels)', () => {
  const parties = partiesOf(SAMPLE);

  it('squares every point and closes every branch', () => {
    expect(unbalancedPoints(parties)).toEqual([]);
    expect(openBranches(parties)).toEqual([]);
  });

  it('multiplies the links of each route (CA 2)', () => {
    expect(totalOf(SAMPLE, 'María')?.total).toBe(60);
    const beto = totalOf(SAMPLE, 'Beto');
    expect(beto?.total).toBe(30);
    expect(beto?.routes[0]?.links.map((link) => link.percentage)).toEqual([
      40, 75,
    ]);
  });

  it('counts exactly the threshold as beneficial owner', () => {
    const carla = totalOf(SAMPLE, 'Carla');
    expect(carla?.total).toBe(10);
    expect(carla?.beneficial).toBe(true);
    expect(carla?.routes[0]?.links).toHaveLength(3);
  });

  it('adds up the routes of the same person (6 % + 4 % is 10 %)', () => {
    const items = [
      natural(HOLDER, 6, 'Ana', 'Ruiz', '001'),
      legal(HOLDER, 94, 'Alfa', 'A1'),
      natural(key('A1'), (4 / 94) * 100, 'Ana', 'Ruiz', '001'),
      natural(key('A1'), 100 - (4 / 94) * 100, 'Otro', 'Más', '002'),
    ];
    const ana = totalOf(items, 'Ana');
    expect(ana?.total).toBe(10);
    expect(ana?.routes).toHaveLength(2);
    expect(ana?.beneficial).toBe(true);
  });
});

describe('ten levels', () => {
  const parties = partiesOf(DEEP);

  it('reaches level ten and squares', () => {
    expect(
      Math.max(...parties.map((party) => levelOf(parties, party.id))),
    ).toBe(10);
    expect(unbalancedPoints(parties)).toEqual([]);
    expect(openBranches(parties)).toEqual([]);
  });

  it('Elena seems to own 8 % and controls 7.2 %', () => {
    const elena = totalOf(DEEP, 'Elena');
    expect(elena?.total).toBe(7.2);
    expect(elena?.beneficial).toBe(false);
    expect(elena?.routes[0]?.links).toHaveLength(6);
  });

  it('Ricardo, at the deepest level, controls 70.38 %', () => {
    expect(totalOf(DEEP, 'Ricardo')?.total).toBe(70.38);
    expect(totalOf(DEEP, 'Sofía')?.total).toBe(12.42);
    expect(
      ownershipTotals(parties, 10).filter((total) => total.beneficial),
    ).toHaveLength(3);
  });
});

describe('points, branches and records', () => {
  it('says what a point has left and which branch is open', () => {
    const items = SAMPLE.slice(0, 2);
    const parties = partiesOf(items);
    expect(remainingIn(parties, HOLDER)).toBe(0);
    expect(remainingIn(parties, '1')).toBe(100);
    expect(openBranches(parties).map((party) => party.name)).toEqual([
      'Inversiones Alfa S.A.',
    ]);
  });

  it('counts the minority aggregate in the company capital', () => {
    const items = [
      {
        ...legal(HOLDER, 100, 'Alfa', 'A1'),
        shareholder_minority_share_percentage: 30,
      },
      natural(key('A1'), 70, 'Ana', 'Ruiz', '001'),
    ];
    expect(unbalancedPoints(partiesOf(items))).toEqual([]);
  });

  it('hangs an unknown parent from the holder', () => {
    const [party] = partiesOf([natural('cat-1', 100, 'Ana', 'Ruiz', '001')]);
    expect(party?.parent).toBe(HOLDER);
  });

  it('takes the highest-level appearance as principal record (CA 4)', () => {
    const items = [
      ...SAMPLE.slice(0, 4),
      natural(key('J0310000067890'), 100, 'María', 'Solís', '001-120385-0012C'),
    ];
    const parties = partiesOf(items);
    expect(principalRecordOf(parties, 'national-id|001-120385-0012c')?.id).toBe(
      '0',
    );
  });

  it('tells apart two companies with the same name', () => {
    const labels = labelsOf(
      partiesOf([
        legal(HOLDER, 50, 'Delta', 'D1'),
        legal(HOLDER, 50, 'Delta', 'D2'),
      ]),
    );
    expect([...labels.values()]).toEqual(['Delta (d1)', 'Delta (d2)']);
  });
});

describe('cycles (Sad Path 6)', () => {
  it('a sound structure has none', () => {
    expect(cyclesIn(partiesOf(SAMPLE))).toEqual([]);
  });

  it('a holding that comes back to itself is reported', () => {
    // POC: Alfa → Beta → Alfa, a cycle that came through the API, not the form.
    const company = (id: string, parent: string): Party => ({
      id,
      parent,
      percentage: 100,
      natural: false,
      legal: true,
      document: id,
      name: id,
      listed: false,
      minority: 0,
    });
    const circular = [
      company('alfa', HOLDER),
      company('beta', 'alfa'),
      company('alfa', 'beta'),
    ];
    expect(cyclesIn(circular)).toEqual([['alfa', 'beta', 'alfa']]);
  });
});

describe('fingerprint (CA 7)', () => {
  it('ignores data the calculation does not read', () => {
    const fixed = SAMPLE.map((item, index) =>
      index === 0 ? { ...item, shareholder_second_last_name: 'Pérez' } : item,
    );
    expect(fingerprintOf(fixed)).toBe(fingerprintOf(SAMPLE));
  });

  it('changes with a percentage', () => {
    const edited = SAMPLE.map((item, index) =>
      index === 0 ? { ...item, shareholder_share_percentage: 55 } : item,
    );
    expect(fingerprintOf(edited)).not.toBe(fingerprintOf(SAMPLE));
    const confirmation = {
      fingerprint: fingerprintOf(SAMPLE),
      confirmed_at: '2026-10-04T12:00:00.000Z',
      threshold: 10,
    };
    expect(isCurrent(confirmation, SAMPLE)).toBe(true);
    expect(isCurrent(confirmation, edited)).toBe(false);
    expect(isCurrent(undefined, SAMPLE)).toBe(false);
  });
});

describe('complementary data (CA 4)', () => {
  const confirmation = {
    fingerprint: fingerprintOf(SAMPLE),
    confirmed_at: '2026-10-04T12:00:00.000Z',
    threshold: 10,
  };
  const scope = {
    [SHAREHOLDERS]: SAMPLE,
    [OWNERSHIP_CONFIRMATION]: confirmation,
  };

  it('is owed by whoever reaches the threshold, once calculated', () => {
    expect(owesComplementary({ ...scope, ...SAMPLE[2] })).toBe(true);
    expect(owesComplementary({ [SHAREHOLDERS]: SAMPLE, ...SAMPLE[2] })).toBe(
      false,
    );
  });

  it('is not owed below the threshold', () => {
    expect(
      owesComplementary({
        ...scope,
        [OWNERSHIP_CONFIRMATION]: { ...confirmation, threshold: 50 },
        ...SAMPLE[2],
      }),
    ).toBe(false);
  });

  it('is asked only in the principal record', () => {
    const items = [
      ...SAMPLE,
      natural(
        key('J0310000067890'),
        0.01,
        'María',
        'Solís',
        '001-120385-0012C',
      ),
    ];
    const values = { ...scope, [SHAREHOLDERS]: items };
    expect(owesComplementary({ ...values, ...items[0] })).toBe(true);
    expect(owesComplementary({ ...values, ...items[5] })).toBe(false);
  });
});

describe('confirmation and closing gate', () => {
  const none = new Set<number>();

  it('cannot confirm an empty, unbalanced or open structure', () => {
    expect(confirmIssue([], none)?.code).toBe('empty_structure');
    expect(confirmIssue(SAMPLE.slice(0, 1), none)).toEqual({
      code: 'unbalanced',
      points: [{ name: undefined, declared: 60 }],
    });
    // POC: an open branch is also a point at 0 %, and squaring is said first.
    expect(confirmIssue(SAMPLE.slice(0, 2), none)).toEqual({
      code: 'unbalanced',
      points: [{ name: 'Inversiones Alfa S.A.', declared: 0 }],
    });
    expect(confirmIssue(SAMPLE, new Set([0]))?.code).toBe('incomplete_items');
    expect(confirmIssue(SAMPLE, none)).toBeUndefined();
  });

  it('closes in the POC order', () => {
    expect(gateIssue(SAMPLE.slice(0, 2), undefined, none)?.code).toBe(
      'open_branches',
    );
    expect(gateIssue(SAMPLE.slice(0, 1), undefined, none)).toEqual({
      code: 'unbalanced',
      name: undefined,
      declared: 60,
    });
    expect(gateIssue(SAMPLE, undefined, none)?.code).toBe('not_confirmed');

    const confirmation = {
      fingerprint: fingerprintOf(SAMPLE),
      confirmed_at: '2026-10-04T12:00:00.000Z',
      threshold: 10,
    };
    expect(gateIssue(SAMPLE, confirmation, none)).toBeUndefined();
    const edited = SAMPLE.map((item, index) =>
      index === 2 ? { ...item, shareholder_share_percentage: 70 } : item,
    );
    expect(gateIssue(edited, confirmation, none)?.code).toBe('unbalanced');
    const swapped = SAMPLE.map((item, index) =>
      index === 2 ?
        { ...item, shareholder_identification_number: 'X-1' }
      : item,
    );
    expect(gateIssue(swapped, confirmation, none)?.code).toBe(
      'stale_calculation',
    );
  });

  it('names who owes complementary data, with company and level', () => {
    const confirmation = {
      fingerprint: fingerprintOf(SAMPLE),
      confirmed_at: '2026-10-04T12:00:00.000Z',
      threshold: 10,
    };
    expect(gateIssue(SAMPLE, confirmation, new Set([2, 4]))).toEqual({
      code: 'missing_complementary',
      pending: [
        { name: 'Beto Rivas', company: 'Inversiones Alfa S.A.', level: 2 },
        { name: 'Carla Núñez', company: 'Gamma Holding S.A.', level: 3 },
      ],
    });
  });

  it('closes unconfirmed only when nobody reaches the threshold (POC screen)', () => {
    expect(gateIssue(SAMPLE, undefined, none, 100)).toBeUndefined();
    expect(gateIssue(SAMPLE, undefined, none, 10)?.code).toBe('not_confirmed');
  });
});

describe('capture-time checks (POC cerrariaUnCiclo, administradorRelacionado, CONSTANCIA_BENEFICIARIO)', () => {
  it('refuses a parent that closes a cycle', () => {
    const alfa = legal(HOLDER, 40, 'Inversiones Alfa S.A.', 'J0310000012345');
    // Alfa under Gamma, which already hangs from Alfa.
    expect(closesCycle(SAMPLE, key('J0310000067890'), alfa)).toBe(true);
    expect(closesCycle(SAMPLE, key('J0310000012345'), alfa)).toBe(true);
    expect(closesCycle(SAMPLE, HOLDER, alfa)).toBe(false);
    // Someone new, or the same person in another branch, is fine.
    const maria = natural(HOLDER, 5, 'María', 'Solís', '001-120385-0012C');
    expect(closesCycle(SAMPLE, key('J0310000067890'), maria)).toBe(false);
  });

  it('reads whether administrators are registered', () => {
    expect(administratorsRegistered({ administrators: [{}] })).toBe(true);
    expect(administratorsRegistered({ administrators: [] })).toBe(false);
    expect(administratorsRegistered({})).toBe(false);
  });

  it('asks the no-beneficial-owner reason only after a calculation without one', () => {
    const confirmation = {
      fingerprint: fingerprintOf(SAMPLE),
      confirmed_at: '2026-10-04T12:00:00.000Z',
      threshold: 100,
    };
    expect(
      withoutBeneficialOwner({
        [SHAREHOLDERS]: SAMPLE,
        [OWNERSHIP_CONFIRMATION]: confirmation,
      }),
    ).toBe(true);
    expect(
      withoutBeneficialOwner({
        [SHAREHOLDERS]: SAMPLE,
        [OWNERSHIP_CONFIRMATION]: { ...confirmation, threshold: 10 },
      }),
    ).toBe(false);
    expect(withoutBeneficialOwner({ [SHAREHOLDERS]: SAMPLE })).toBe(false);
  });
});
