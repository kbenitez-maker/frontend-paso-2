import type { BlockOf } from '@/lib/constants/steps';
import type {
  RelatedPartyMatrix,
  RequiredRole,
} from '@/server/api/related-party-matrix';

import { isBlockOf } from '@/lib/constants/steps';
import {
  ADMINISTRATORS_REGISTERED,
  OWNERSHIP_CONFIRMATION,
  OWNERSHIP_WITHOUT_BENEFICIAL_OWNER,
  SHAREHOLDER_OWES_COMPLEMENTARY,
} from '@/lib/ownership';

/*
 * Routing of the related-parties step (POC socios-relacionados.ts, ruta-b.ts,
 * fideicomiso.ts and completitud.ts). The matrix entry of the company decides
 * which blocks exist; the saved answers decide which of them still wait for an
 * earlier one. Pure: the route is derived here, not stored.
 */

type RelatedPartiesBlock = BlockOf<'related-parties'>;

type Values = Readonly<Record<string, unknown>>;

/** Context key the field conditions read the registration route under (absent when unmapped). */
const REGISTRATION_ROUTE = 'registration_route';

/** Keys field conditions may read that no overlay owns: the API derives them. */
const EXTERNAL_CONTEXT_KEYS: readonly string[] = [
  REGISTRATION_ROUTE,
  OWNERSHIP_CONFIRMATION,
  SHAREHOLDER_OWES_COMPLEMENTARY,
  ADMINISTRATORS_REGISTERED,
  OWNERSHIP_WITHOUT_BENEFICIAL_OWNER,
];

/** Answer of "Does the holder company list its shares on a stock exchange?". */
const HOLDER_LISTED = 'holder_is_listed';

/** Where a people section keeps its items, their roles and the positions they hold. */
interface PeopleKeys {
  items: string;
  roles: string;
  positions: readonly string[];
}

const PEOPLE = new Map<string, PeopleKeys>([
  [
    'administrators',
    {
      items: 'administrators',
      roles: 'admin_role_ids',
      positions: ['admin_board_position_ids', 'admin_admin_position_ids'],
    },
  ],
  [
    'trust-administrators',
    {
      items: 'trust_administrators',
      roles: 'trust_admin_role_ids',
      positions: ['trust_admin_committee_position_ids'],
    },
  ],
  [
    'trust-parties',
    { items: 'trust_parties', roles: 'trust_party_role_ids', positions: [] },
  ],
]);

/** Roles nobody holds, and positions of a held role nobody covers (POC `Falta`). */
interface MissingRoles {
  roles: string[];
  positions: { role_id: string; position_id: string }[];
}

const isValues = (value: unknown): value is Values =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const strings = (value: unknown): string[] =>
  Array.isArray(value) ?
    value.filter((entry): entry is string => typeof entry === 'string')
  : [];

const itemsOf = (values: Values, key: string): Values[] => {
  const items = Object.entries(values).find(([name]) => name === key)?.[1];
  return Array.isArray(items) ? items.filter(isValues) : [];
};

/** Collection key of a people block; `undefined` for the other blocks. */
const peopleCollectionOf = (block: string): string | undefined =>
  PEOPLE.get(block)?.items;

/** Saved answer of the listing question (`true`, `false` or absent). */
const listingAnswer = (values: Values): unknown => values['holder_is_listed'];

/** Values of one item field (a multi catalog). */
const listOf = (item: Values, key: string): string[] =>
  strings(Object.entries(item).find(([name]) => name === key)?.[1]);

const requiredRolesOf = (
  matrix: RelatedPartyMatrix,
  block: string,
): readonly RequiredRole[] =>
  matrix.sections.find((section) => section.key === block)?.required_roles ??
  [];

/**
 * What the registered people of a section lack against the matrix (POC
 * `faltantesDeMatriz`): a role nobody holds, or a position of a held role
 * nobody covers. Positions of a missing role are not claimed twice.
 */
const missingRoles = (
  matrix: RelatedPartyMatrix,
  block: string,
  values: Values,
): MissingRoles => {
  const keys = PEOPLE.get(block);
  if (keys === undefined) return { roles: [], positions: [] };

  const items = itemsOf(values, keys.items);
  const held = new Set(items.flatMap((item) => listOf(item, keys.roles)));
  const covered = new Set(
    items.flatMap((item) => keys.positions.flatMap((key) => listOf(item, key))),
  );
  const missing: MissingRoles = { roles: [], positions: [] };

  for (const { role_id, position_ids } of requiredRolesOf(matrix, block)) {
    if (!held.has(role_id)) {
      missing.roles.push(role_id);
      continue;
    }
    for (const position_id of position_ids) {
      if (!covered.has(position_id))
        missing.positions.push({ role_id, position_id });
    }
  }
  return missing;
};

const hasMissing = ({ roles, positions }: MissingRoles): boolean =>
  roles.length > 0 || positions.length > 0;

/** A people section is complete with someone registered and no role or position missing. */
const isPeopleComplete = (
  matrix: RelatedPartyMatrix,
  block: RelatedPartiesBlock,
  values: Values,
): boolean =>
  itemsOf(values, peopleCollectionOf(block) ?? '').length > 0 &&
  !hasMissing(missingRoles(matrix, block, values));

/** A form key a block breaks against its route, with the error code. */
interface RouteIssue {
  path: string;
  code: 'unmapped_entity_type' | 'missing_roles';
}

/**
 * What keeps a block from completing besides its fields: an unmapped legal
 * entity type stops at the listing question (POC Sad Path 4), and a people
 * section with someone registered needs every role and position the matrix
 * requires (POC completitud.ts; without people the collection minimum applies).
 */
const routeIssues = (
  matrix: RelatedPartyMatrix,
  block: string,
  values: Values,
): RouteIssue[] => {
  if (matrix.route === null) {
    return block === 'holder-listing' ?
        [{ path: HOLDER_LISTED, code: 'unmapped_entity_type' }]
      : [];
  }
  const collection = peopleCollectionOf(block);
  return (
      collection !== undefined &&
        itemsOf(values, collection).length > 0 &&
        hasMissing(missingRoles(matrix, block, values))
    ) ?
      [{ path: collection, code: 'missing_roles' }]
    : [];
};

/** POC `esperaA`: what a block waits for before it can be filled. */
type Wait = (matrix: RelatedPartyMatrix, values: Values) => boolean;

const WAITS = new Map<string, Wait>([
  // The listing question comes first: no section opens until it is answered.
  [
    'administrators',
    (matrix, values) =>
      matrix.route === 'A' && typeof listingAnswer(values) !== 'boolean',
  ],
  [
    'shareholders',
    (matrix, values) => !isPeopleComplete(matrix, 'administrators', values),
  ],
  [
    'trust-parties',
    (matrix, values) =>
      !isPeopleComplete(matrix, 'trust-administrators', values),
  ],
  [
    'trust-closing',
    (_matrix, values) => itemsOf(values, 'trust_parties').length === 0,
  ],
]);

interface RouteBlock {
  key: RelatedPartiesBlock;
  /** Listed but not open yet: its fields wait for an earlier block. */
  waiting: boolean;
}

/**
 * Blocks of the related-parties step for the company, in order. An unmapped
 * legal entity type keeps only the listing question (it carries the notice);
 * a listed holder has no shareholders block.
 */
const routeBlocks = (
  matrix: RelatedPartyMatrix,
  values: Values,
): RouteBlock[] => {
  if (matrix.route === null) return [{ key: 'holder-listing', waiting: false }];

  return matrix.sections.flatMap(({ key }): RouteBlock[] => {
    if (!isBlockOf('related-parties', key)) return [];
    if (key === 'shareholders' && listingAnswer(values) === true) return [];
    return [{ key, waiting: WAITS.get(key)?.(matrix, values) ?? false }];
  });
};

/** Blocks whose waiting copy (`Steps.rail.waiting`) says what they wait for (POC `esperaA`). */
const WAITING_COPY = {
  shareholders: 'shareholders',
  'trust-parties': 'trust-parties',
  'trust-closing': 'trust-closing',
} as const satisfies Partial<Record<RelatedPartiesBlock, string>>;

/** Key of `Steps.rail.waiting` for a waiting block; the others wait for "an earlier step". */
const waitingCopyOf = (
  block: string,
): (typeof WAITING_COPY)[keyof typeof WAITING_COPY] | 'default' =>
  Object.entries(WAITING_COPY).find(([key]) => key === block)?.[1] ?? 'default';

/** Title key (`Steps.blocks`) of a block: route B registers its governing body in the administrators block. */
const routeBlockTitle = (
  block: RelatedPartiesBlock,
  matrix: RelatedPartyMatrix | undefined,
): RelatedPartiesBlock | 'governing-body' =>
  block === 'administrators' && matrix?.route === 'B' ?
    'governing-body'
  : block;

/** Context the field conditions of the step read: the registration route. */
const routeContext = (
  matrix: RelatedPartyMatrix | undefined,
): Record<string, string> =>
  matrix?.route === undefined || matrix.route === null ?
    {}
  : { [REGISTRATION_ROUTE]: matrix.route };

export {
  EXTERNAL_CONTEXT_KEYS,
  hasMissing,
  HOLDER_LISTED,
  missingRoles,
  peopleCollectionOf,
  REGISTRATION_ROUTE,
  routeBlocks,
  routeBlockTitle,
  routeContext,
  routeIssues,
  type MissingRoles,
  type RelatedPartiesBlock,
  type RouteBlock,
  type RouteIssue,
  waitingCopyOf,
};
