import { describe, expect, it } from 'vitest';

import {
  missingRoles,
  routeBlocks,
  routeBlockTitle,
  routeContext,
  routeIssues,
} from '@/lib/related-parties';
import { MATRICES } from '@/test/related-party-matrix';

const admin = (roles: string[], positions: string[] = []) => ({
  admin_role_ids: roles,
  admin_board_position_ids: positions,
});

const COMPLETE_ADMINS = {
  administrators: [
    admin(['legal-representative']),
    admin(['board-member'], ['president']),
  ],
};

describe('routeBlocks', () => {
  it('opens route A with the listing question; administrators wait for its answer', () => {
    expect(routeBlocks(MATRICES.A, {})).toEqual([
      { key: 'holder-listing', waiting: false },
      { key: 'administrators', waiting: true },
      { key: 'shareholders', waiting: true },
    ]);
  });

  it('hides the shareholders of a listed holder', () => {
    expect(
      routeBlocks(MATRICES.A, { holder_is_listed: true }).map(({ key }) => key),
    ).toEqual(['holder-listing', 'administrators']);
  });

  it('opens the shareholders once administrators hold every required role', () => {
    const blocks = (values: Record<string, unknown>) =>
      routeBlocks(MATRICES.A, { holder_is_listed: false, ...values });

    expect(blocks({})[2]).toEqual({ key: 'shareholders', waiting: true });
    expect(
      blocks({ administrators: [admin(['legal-representative'])] })[2],
    ).toEqual({ key: 'shareholders', waiting: true });
    expect(blocks(COMPLETE_ADMINS)).toEqual([
      { key: 'holder-listing', waiting: false },
      { key: 'administrators', waiting: false },
      { key: 'shareholders', waiting: false },
    ]);
  });

  it('gives route B its single block and route C its three, in order', () => {
    expect(routeBlocks(MATRICES.B, {})).toEqual([
      { key: 'administrators', waiting: false },
    ]);
    expect(routeBlocks(MATRICES.C, {})).toEqual([
      { key: 'trust-administrators', waiting: false },
      { key: 'trust-parties', waiting: true },
      { key: 'trust-closing', waiting: true },
    ]);
    expect(
      routeBlocks(MATRICES.C, {
        trust_administrators: [{ trust_admin_role_ids: ['trust-manager'] }],
        trust_parties: [{ trust_party_role_ids: ['beneficiary'] }],
      }).map(({ waiting }) => waiting),
    ).toEqual([false, false, false]);
  });

  it('keeps only the listing question for an unmapped type', () => {
    expect(routeBlocks(MATRICES.unmapped, {})).toEqual([
      { key: 'holder-listing', waiting: false },
    ]);
  });
});

describe('missingRoles', () => {
  it('names missing roles, and positions only of the roles someone holds', () => {
    expect(missingRoles(MATRICES.A, 'administrators', {})).toEqual({
      roles: ['legal-representative', 'board-member'],
      positions: [],
    });
    expect(
      missingRoles(MATRICES.A, 'administrators', {
        administrators: [admin(['legal-representative', 'board-member'])],
      }),
    ).toEqual({
      roles: [],
      positions: [{ role_id: 'board-member', position_id: 'president' }],
    });
    expect(missingRoles(MATRICES.A, 'administrators', COMPLETE_ADMINS)).toEqual(
      { roles: [], positions: [] },
    );
  });

  it('asks nothing of a block that is not a list of people', () => {
    expect(missingRoles(MATRICES.A, 'holder-listing', {})).toEqual({
      roles: [],
      positions: [],
    });
  });
});

describe('routeIssues', () => {
  it('stops an unmapped type at the listing question', () => {
    expect(routeIssues(MATRICES.unmapped, 'holder-listing', {})).toEqual([
      { path: 'holder_is_listed', code: 'unmapped_entity_type' },
    ]);
  });

  it('flags people missing a required role, once someone is registered', () => {
    expect(routeIssues(MATRICES.A, 'administrators', {})).toEqual([]);
    expect(
      routeIssues(MATRICES.A, 'administrators', {
        administrators: [admin(['legal-representative'])],
      }),
    ).toEqual([{ path: 'administrators', code: 'missing_roles' }]);
    expect(routeIssues(MATRICES.A, 'administrators', COMPLETE_ADMINS)).toEqual(
      [],
    );
  });
});

describe('route context and titles', () => {
  it('exposes the route to the field conditions, nothing when unmapped', () => {
    expect(routeContext(MATRICES.B)).toEqual({ registration_route: 'B' });
    expect(routeContext(MATRICES.unmapped)).toEqual({});
    expect(routeContext(undefined)).toEqual({});
  });

  it('titles the route B administrators block after the governing body', () => {
    expect(routeBlockTitle('administrators', MATRICES.B)).toBe(
      'governing-body',
    );
    expect(routeBlockTitle('administrators', MATRICES.A)).toBe(
      'administrators',
    );
  });
});
