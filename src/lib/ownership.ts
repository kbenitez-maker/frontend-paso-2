// cspell:ignore PAIS Confirmacion Participacion
/*
 * Ownership structure of the holder company (ITDFCJ-46 and 47), ported from the
 * POC (lib/relacionados/estructura.ts, cierre.ts and reparto.ts at 43057bb9).
 *
 * A graph, not a tree: nodes are shareholders and edges are holdings with
 * their percentage, and a company may hold shares in two branches. The graph
 * is not stored: it is derived from the flat list of shareholders, where each
 * item says which company it holds shares in (`shareholder_parent_company_id`,
 * the holder or the identification of a shareholder company) and how much.
 * Pure: the structure is derived here, not stored.
 */

type Item = Readonly<Record<string, unknown>>;

/** Parent value of a shareholder of the holder company itself. */
const HOLDER = 'holder';

/** POC reglas.ts UMBRAL_POR_PAIS: 10 % in every country, inclusive. */
const OWNERSHIP_THRESHOLD = 10;

const SHAREHOLDERS = 'shareholders';

/** Context key the API puts the stored confirmation (`OwnershipConfirmation`) under. */
const OWNERSHIP_CONFIRMATION = 'ownership_confirmation';

/**
 * Computed key a shareholder field condition may read: `true` when the
 * calculation ran and this record is the principal record (highest-level
 * appearance) of a person at or above the threshold (POC accionistas.ts
 * `debeDarComplementarios`). No section holds it.
 */
const SHAREHOLDER_OWES_COMPLEMENTARY = 'shareholder_owes_complementary';

/**
 * Computed key: `true` once some administrator is registered, so a
 * shareholder can be picked from them (POC accionistas.ts
 * `administradorRelacionado`). No section holds it.
 */
const ADMINISTRATORS_REGISTERED = 'administrators_registered';

/**
 * Computed key: `true` when the calculation ran and no natural person reached
 * the threshold, so the reason must be recorded (POC accionistas.ts
 * `sinBeneficiarioFinal`, ITDFCJ-47 CA 9). No section holds it.
 */
const OWNERSHIP_WITHOUT_BENEFICIAL_OWNER = 'ownership_without_beneficial_owner';

const KEYS = {
  parent: 'shareholder_parent_company_id',
  percentage: 'shareholder_share_percentage',
  personType: 'shareholder_person_type_id',
  idType: 'shareholder_identification_type_id',
  idNumber: 'shareholder_identification_number',
  firstName: 'shareholder_first_name',
  lastName: 'shareholder_last_name',
  legalName: 'shareholder_legal_name',
  listed: 'shareholder_is_listed',
  minority: 'shareholder_minority_share_percentage',
} as const;

/** One holding of the graph, read from a shareholder item. */
interface Party {
  /** Position of the item in the list. */
  id: string;
  /** Node whose capital it holds: `HOLDER` or the id of a shareholder company. */
  parent: string;
  percentage: number;
  natural: boolean;
  legal: boolean;
  /** Identification type and number: how a person is recognized (ITDFCJ-47 CA 2). */
  document: string;
  name: string;
  /** Answered that it is listed on a stock exchange (closes the branch). */
  listed: boolean;
  /** Aggregate of its shareholders below 10 % (they square its capital unlisted). */
  minority: number;
}

/** What the API stores when the structure is confirmed (POC `Confirmacion`). */
interface OwnershipConfirmation {
  /** Fingerprint of the structure the calculation ran on. */
  fingerprint: string;
  /** ISO date and time of the calculation. */
  confirmed_at: string;
  /** Threshold the calculation applied. */
  threshold: number;
}

/** A link of a route: the company or person the share passes through, and its part. */
interface Link {
  name: string;
  percentage: number;
}

/** A route from the holder to the person, with its links (POC `Camino`). */
interface Route {
  percentage: number;
  links: readonly Link[];
}

/** Total participation of a natural person (POC `ParticipacionTotal`). */
interface OwnershipTotal {
  document: string;
  name: string;
  /** Sum of the direct and every indirect route, rounded to hundredths. */
  total: number;
  routes: readonly Route[];
  /** Inclusive: exactly the threshold counts. */
  beneficial: boolean;
}

const text = (item: Item, key: string): string => {
  // eslint-disable-next-line security/detect-object-injection -- keys are the constants above
  const value = item[key];
  return typeof value === 'string' ? value.trim() : '';
};

const numberOf = (item: Item, key: string): number => {
  // eslint-disable-next-line security/detect-object-injection -- keys are the constants above
  const value = item[key];
  const parsed =
    typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isItem = (value: unknown): value is Item =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const itemsIn = (value: unknown): Item[] =>
  Array.isArray(value) ? value.filter(isItem) : [];

const round = (value: number): number => Math.round(value * 100) / 100;

/** Identification type and number, normalized; empty while the number is missing. */
const documentOf = (item: Item): string =>
  text(item, KEYS.idNumber) === '' ? '' : (
    `${text(item, KEYS.idType)}|${text(item, KEYS.idNumber)}`.toLowerCase()
  );

/** First name and surname, or the legal name of a company (POC `nombreDe`). */
const nameOf = (item: Item): string => {
  const person = [text(item, KEYS.firstName), text(item, KEYS.lastName)]
    .filter(Boolean)
    .join(' ');
  return person === '' ? text(item, KEYS.legalName) : person;
};

/** Value the shareholders of this item store as their parent: its identification, else its position. */
const pointKeyOf = (item: Item, index: number): string => {
  const document = documentOf(item);
  return document === '' ? `#${String(index)}` : document;
};

/**
 * The list as holdings. A parent no item matches (removed, or a value from
 * before the tree) hangs from the holder, as in the POC.
 */
const parentResolver = (items: readonly Item[]) => {
  const byKey = new Map<string, string>();
  items.forEach((item, index) => {
    const key = pointKeyOf(item, index);
    if (!byKey.has(key)) byKey.set(key, String(index));
  });
  return (item: Item): string => byKey.get(text(item, KEYS.parent)) ?? HOLDER;
};

const partiesOf = (items: readonly Item[]): Party[] => {
  const parentOf = parentResolver(items);
  return items.map((item, index) => ({
    id: String(index),
    parent: parentOf(item),
    percentage: numberOf(item, KEYS.percentage),
    natural: text(item, KEYS.personType) === 'natural',
    legal: text(item, KEYS.personType) === 'legal',
    document: documentOf(item),
    name: nameOf(item),
    listed: item[KEYS.listed] === true,
    minority: numberOf(item, KEYS.minority),
  }));
};

/**
 * Labels of the parties, the identification number appended when two share a
 * name (POC `etiquetasDePuntos`): two companies may be called the same.
 */
const labelsOf = (parties: readonly Party[]): Map<string, string> => {
  const count = new Map<string, number>();
  for (const party of parties) {
    count.set(party.name, (count.get(party.name) ?? 0) + 1);
  }
  return new Map(
    parties.map((party) => {
      const number = party.document.split('|')[1] ?? '';
      const label =
        party.name === '' ? `#${String(Number(party.id) + 1)}` : party.name;
      return [
        party.id,
        (count.get(party.name) ?? 0) > 1 && number !== '' ?
          `${label} (${number})`
        : label,
      ];
    }),
  );
};

/** The three stop rules of ITDFCJ-46 CA 10 (no legal entity type without structure here). */
const closesBranch = (party: Party): boolean => party.natural || party.listed;

/** A legal entity whose own shareholders must be registered. */
const takesShareholders = (party: Party): boolean =>
  party.legal && !closesBranch(party);

/** Capital declared at a node: its shareholders, plus its aggregate of minority shareholders. */
const declaredIn = (parties: readonly Party[], node: string): number =>
  parties
    .filter((party) => party.parent === node)
    .reduce((sum, party) => sum + party.percentage, 0) +
  (parties.find((party) => party.id === node)?.minority ?? 0);

/** Capital a node still has to give out (negative when it gives out more than 100 %). */
const remainingIn = (parties: readonly Party[], node: string): number =>
  round(100 - declaredIn(parties, node));

/** Nodes whose shares do not add up to 100 % (CA 15); the holder always counts. */
const unbalancedPoints = (
  parties: readonly Party[],
): { node: string; declared: number }[] =>
  [HOLDER, ...parties.filter(takesShareholders).map((party) => party.id)]
    .map((node) => ({ node, declared: round(declaredIn(parties, node)) }))
    .filter(({ declared }) => Math.abs(declared - 100) > 0.005);

/** Companies whose structure is still to be registered (CA 17). */
const openBranches = (parties: readonly Party[]): Party[] =>
  parties.filter(
    (party) =>
      takesShareholders(party) &&
      !parties.some((other) => other.parent === party.id),
  );

/** Level of a holding: 1 holds shares in the holder (CA 9); capped against a cycle. */
const levelOf = (parties: readonly Party[], id: string): number => {
  let current = id;
  let level = 1;
  while (level < 50) {
    const party = parties.find((candidate) => candidate.id === current);
    if (party === undefined || party.parent === HOLDER) return level;
    current = party.parent;
    level += 1;
  }
  return level;
};

/** Principal record of a person: their highest-level appearance (ITDFCJ-47 CA 4). */
const principalRecordOf = (
  parties: readonly Party[],
  document: string,
): Party | undefined =>
  parties
    .filter((party) => party.document === document)
    .reduce<Party | undefined>(
      (best, party) =>
        (
          best === undefined ||
          levelOf(parties, party.id) < levelOf(parties, best.id)
        ) ?
          party
        : best,
      undefined,
    );

/**
 * Total participation of each natural person (ITDFCJ-47 CA 2): the product of
 * the links of each route from the holder, summed over every route of the
 * same person (by identification) and compared once against the threshold.
 */
const ownershipTotals = (
  parties: readonly Party[],
  threshold: number,
): OwnershipTotal[] => {
  const found = new Map<
    string,
    { name: string; shares: number[]; routes: Route[] }
  >();
  const labels = labelsOf(parties);

  const walk = (
    node: string,
    factor: number,
    visited: ReadonlySet<string>,
    links: readonly Link[],
  ) => {
    for (const party of parties.filter((other) => other.parent === node)) {
      if (visited.has(party.id)) continue;
      const share = (factor * party.percentage) / 100;
      const link = {
        name: labels.get(party.id) ?? party.name,
        percentage: party.percentage,
      };
      if (party.natural) {
        const entry = found.get(party.document) ?? {
          name: party.name,
          shares: [],
          routes: [],
        };
        entry.shares.push(share);
        entry.routes.push({
          percentage: round(share),
          links: [...links, link],
        });
        found.set(party.document, entry);
        continue;
      }
      // Guard against endless recursion, apart from the cycle check (Sad Path 6).
      walk(party.id, share, new Set([...visited, party.id]), [...links, link]);
    }
  };
  walk(HOLDER, 100, new Set(), []);

  return [...found.entries()].map(([document, { name, shares, routes }]) => {
    // Summed in full and rounded at the end: 6 % + 4 % is exactly 10.00.
    const total = round(shares.reduce((sum, share) => sum + share, 0));
    return { document, name, total, routes, beneficial: total >= threshold };
  });
};

/** Cycles of the graph reachable from the holder, each as the ids that close it (POC `ciclosEn`). */
const cyclesIn = (parties: readonly Party[]): string[][] => {
  const found: string[][] = [];
  const closed = new Set<string>();
  const walk = (node: string, path: readonly string[]) => {
    for (const party of parties.filter((other) => other.parent === node)) {
      const from = path.indexOf(party.id);
      if (from !== -1) {
        if (!closed.has(party.id)) {
          closed.add(party.id);
          found.push([...path.slice(from), party.id]);
        }
        continue;
      }
      if (!party.natural) walk(party.id, [...path, party.id]);
    }
  };
  walk(HOLDER, []);
  return found;
};

/**
 * Whether registering the person of `item` under `parent` (a parent value:
 * `HOLDER` or a company's point key) closes a cycle: the same identification
 * appears going up from that company to the holder (POC `cerrariaUnCiclo`,
 * ITDFCJ-46 CA 14).
 */
const closesCycle = (
  items: readonly Item[],
  parent: unknown,
  item: Item,
): boolean => {
  const document = documentOf(item);
  if (document === '' || typeof parent !== 'string') return false;
  const parties = partiesOf(items);
  const parentOf = parentResolver(items);
  const visited = new Set<string>();
  let current = parentOf({ [KEYS.parent]: parent });
  while (current !== HOLDER && !visited.has(current)) {
    visited.add(current);
    const party = parties.find((candidate) => candidate.id === current);
    if (party === undefined) return false;
    if (party.document === document) return true;
    current = party.parent;
  }
  return false;
};

/**
 * Fingerprint of what the calculation depends on (CA 7): fixing a second
 * surname keeps the calculation current, changing a percentage does not.
 */
const fingerprintOf = (items: readonly Item[]): string =>
  JSON.stringify(
    partiesOf(items).map((party) => [
      party.parent,
      party.percentage,
      party.natural,
      party.legal,
      party.document,
      party.listed,
      party.minority,
    ]),
  );

const isOwnershipConfirmation = (
  value: unknown,
): value is OwnershipConfirmation =>
  isItem(value) &&
  typeof value['fingerprint'] === 'string' &&
  typeof value['confirmed_at'] === 'string' &&
  typeof value['threshold'] === 'number';

/** The shareholders among the values of a block, a section or a request. */
const shareholdersIn = (values: Item): Item[] =>
  itemsIn(values['shareholders']);

/** The stored confirmation among the values a condition sees (the API adds it as context). */
const confirmationIn = (values: Item): OwnershipConfirmation | undefined => {
  const value = values['ownership_confirmation'];
  return isOwnershipConfirmation(value) ? value : undefined;
};

/** Whether the stored calculation still matches the structure. */
const isCurrent = (
  confirmation: OwnershipConfirmation | undefined,
  items: readonly Item[],
): boolean => confirmation?.fingerprint === fingerprintOf(items);

const owesCache = new WeakMap<object, Map<number, OwnershipTotal[]>>();

/** Totals of a saved list, cached per list and threshold (conditions read them per field). */
const cachedTotals = (
  list: object,
  parties: readonly Party[],
  threshold: number,
): OwnershipTotal[] => {
  const byThreshold =
    owesCache.get(list) ?? new Map<number, OwnershipTotal[]>();
  owesCache.set(list, byThreshold);
  const cached = byThreshold.get(threshold);
  if (cached !== undefined) return cached;
  const totals = ownershipTotals(parties, threshold);
  byThreshold.set(threshold, totals);
  return totals;
};

/**
 * `SHAREHOLDER_OWES_COMPLEMENTARY` over the values a shareholder condition
 * sees (the section with its list, the context with the confirmation, the
 * item on top): the calculation ran, the person reached the threshold and
 * this item is their principal record (POC `debeDarComplementarios`).
 */
const owesComplementary = (values: Item): boolean => {
  const confirmation = values['ownership_confirmation'];
  const list = values['shareholders'];
  if (!isOwnershipConfirmation(confirmation) || !Array.isArray(list)) {
    return false;
  }
  const document = documentOf(values);
  if (document === '') return false;
  const parties = partiesOf(itemsIn(list));
  const mine = cachedTotals(list, parties, confirmation.threshold).find(
    (total) => total.document === document,
  );
  if (mine?.beneficial !== true) return false;
  const principal = principalRecordOf(parties, document);
  return (
    principal === undefined ||
    principal.parent === parentResolver(itemsIn(list))(values)
  );
};

/** `ADMINISTRATORS_REGISTERED` over the values a shareholder condition sees. */
const administratorsRegistered = (values: Item): boolean =>
  itemsIn(values['administrators']).length > 0;

/** `OWNERSHIP_WITHOUT_BENEFICIAL_OWNER` over the values a section condition sees. */
const withoutBeneficialOwner = (values: Item): boolean => {
  const confirmation = values['ownership_confirmation'];
  const list = values['shareholders'];
  if (!isOwnershipConfirmation(confirmation) || !Array.isArray(list)) {
    return false;
  }
  const parties = partiesOf(itemsIn(list));
  return !cachedTotals(list, parties, confirmation.threshold).some(
    (total) => total.beneficial,
  );
};

/** A person who reached the threshold and still owes complementary data (POC `Pendiente`). */
interface Pending {
  name: string;
  /** Company they hold shares in (the holder: `undefined`). */
  company: string | undefined;
  level: number;
}

/** Why the structure cannot be confirmed yet (POC resumen-estructura `faltaParaConfirmar`). */
type ConfirmIssue =
  | { code: 'empty_structure' }
  | {
      code: 'unbalanced';
      points: { name: string | undefined; declared: number }[];
    }
  | { code: 'open_branches'; names: string[] }
  | { code: 'incomplete_items' }
  | { code: 'ownership_cycle'; path: string[] };

/** Why the shareholders section cannot close (POC accionistas.ts `validar`). */
type GateIssue =
  | { code: 'open_branches'; names: string[] }
  | { code: 'unbalanced'; name: string | undefined; declared: number }
  | { code: 'stale_calculation' }
  | { code: 'ownership_cycle'; path: string[] }
  | { code: 'not_confirmed' }
  | { code: 'missing_complementary'; pending: Pending[] };

const nodeName = (
  labels: ReadonlyMap<string, string>,
  node: string,
): string | undefined => (node === HOLDER ? undefined : labels.get(node));

const cycleIssue = (
  parties: readonly Party[],
): { code: 'ownership_cycle'; path: string[] } | undefined => {
  const [cycle] = cyclesIn(parties);
  if (cycle === undefined) return undefined;
  const labels = labelsOf(parties);
  return {
    code: 'ownership_cycle',
    path: cycle.map((id) => labels.get(id) ?? id),
  };
};

/**
 * What keeps the structure from being confirmed, in the POC order: someone
 * registered, every point squares, every branch closes, every item complete;
 * then the calculation itself refuses a cycle. `incomplete` holds the
 * positions of items with missing or invalid answers.
 */
const confirmIssue = (
  items: readonly Item[],
  incomplete: ReadonlySet<number>,
): ConfirmIssue | undefined => {
  if (items.length === 0) return { code: 'empty_structure' };
  const parties = partiesOf(items);
  const labels = labelsOf(parties);
  const unbalanced = unbalancedPoints(parties);
  if (unbalanced.length > 0) {
    return {
      code: 'unbalanced',
      points: unbalanced.map(({ node, declared }) => ({
        name: nodeName(labels, node),
        declared,
      })),
    };
  }
  const open = openBranches(parties);
  if (open.length > 0) {
    return {
      code: 'open_branches',
      names: open.map((party) => labels.get(party.id) ?? party.name),
    };
  }
  if (incomplete.size > 0) return { code: 'incomplete_items' };
  return cycleIssue(parties);
};

/**
 * Closing gate of the shareholders section, in the POC order: open branches,
 * points that do not square, a calculation made stale by a later edit, a
 * cycle, then the complementary data of whoever reached the threshold, named
 * with the company and level of their principal record. As on the POC screen,
 * a structure nobody reaches `threshold` in closes without the calculation;
 * otherwise it is required, since the complementary data is only asked after
 * it. `incomplete` holds the positions of items with missing answers.
 */
const gateIssue = (
  items: readonly Item[],
  confirmation: OwnershipConfirmation | undefined,
  incomplete: ReadonlySet<number>,
  threshold: number = OWNERSHIP_THRESHOLD,
): GateIssue | undefined => {
  if (items.length === 0) return undefined;
  const parties = partiesOf(items);
  const labels = labelsOf(parties);
  const open = openBranches(parties);
  if (open.length > 0) {
    return {
      code: 'open_branches',
      names: open.map((party) => labels.get(party.id) ?? party.name),
    };
  }
  const [unbalanced] = unbalancedPoints(parties);
  if (unbalanced !== undefined) {
    return {
      code: 'unbalanced',
      name: nodeName(labels, unbalanced.node),
      declared: unbalanced.declared,
    };
  }
  if (confirmation !== undefined && !isCurrent(confirmation, items)) {
    return { code: 'stale_calculation' };
  }
  const cycle = cycleIssue(parties);
  if (cycle !== undefined) return cycle;
  if (confirmation === undefined) {
    return (
        ownershipTotals(parties, threshold).some((total) => total.beneficial)
      ) ?
        { code: 'not_confirmed' }
      : undefined;
  }

  const pending = ownershipTotals(parties, confirmation.threshold).flatMap(
    (total): Pending[] => {
      const principal =
        total.beneficial ?
          principalRecordOf(parties, total.document)
        : undefined;
      return principal === undefined || !incomplete.has(Number(principal.id)) ?
          []
        : [
            {
              name: total.name,
              company: nodeName(labels, principal.parent),
              level: levelOf(parties, principal.id),
            },
          ];
    },
  );
  return pending.length > 0 ?
      { code: 'missing_complementary', pending }
    : undefined;
};

export {
  ADMINISTRATORS_REGISTERED,
  administratorsRegistered,
  closesBranch,
  closesCycle,
  confirmationIn,
  confirmIssue,
  cyclesIn,
  declaredIn,
  documentOf,
  fingerprintOf,
  gateIssue,
  HOLDER,
  isCurrent,
  isOwnershipConfirmation,
  itemsIn,
  labelsOf,
  levelOf,
  nameOf,
  openBranches,
  OWNERSHIP_CONFIRMATION,
  OWNERSHIP_THRESHOLD,
  OWNERSHIP_WITHOUT_BENEFICIAL_OWNER,
  ownershipTotals,
  owesComplementary,
  partiesOf,
  pointKeyOf,
  principalRecordOf,
  remainingIn,
  SHAREHOLDER_OWES_COMPLEMENTARY,
  SHAREHOLDERS,
  shareholdersIn,
  takesShareholders,
  unbalancedPoints,
  withoutBeneficialOwner,
  type ConfirmIssue,
  type GateIssue,
  type Link,
  type OwnershipConfirmation,
  type OwnershipTotal,
  type Party,
  type Pending,
  type Route,
};
