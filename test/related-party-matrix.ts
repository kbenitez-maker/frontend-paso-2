import type { RelatedPartyMatrix } from '@/server/api';

/** Matrix entries of the four kinds of company (provisional codes). */
const MATRICES = {
  A: {
    legal_entity_type_id: 'corporation',
    route: 'A',
    sections: [
      { key: 'holder-listing', required_roles: [] },
      {
        key: 'administrators',
        required_roles: [
          { role_id: 'legal-representative', position_ids: [] },
          { role_id: 'board-member', position_ids: ['president'] },
        ],
      },
      { key: 'shareholders', required_roles: [] },
    ],
  },
  B: {
    legal_entity_type_id: 'nonprofit',
    route: 'B',
    sections: [
      {
        key: 'administrators',
        required_roles: [{ role_id: 'legal-representative', position_ids: [] }],
      },
    ],
  },
  C: {
    legal_entity_type_id: 'trust',
    route: 'C',
    sections: [
      {
        key: 'trust-administrators',
        required_roles: [{ role_id: 'trust-manager', position_ids: [] }],
      },
      {
        key: 'trust-parties',
        required_roles: [{ role_id: 'settlor', position_ids: [] }],
      },
      { key: 'trust-closing', required_roles: [] },
    ],
  },
  unmapped: { legal_entity_type_id: 'unclassified', route: null, sections: [] },
} as const satisfies Record<string, RelatedPartyMatrix>;

type Sections = Readonly<Record<string, Record<string, unknown>>>;

/**
 * Query mocks of `@/server/api` the related-parties route reads: the saved
 * sections (the company type in `identification`) and the matrix entry.
 */
const routeQueries = (
  matrix: () => RelatedPartyMatrix,
  sections: () => Sections = () => ({}),
) => ({
  sectionQuery: (id: string, key: string) => ({
    queryKey: ['section', id, key],
    queryFn: () =>
      Promise.resolve({
        section_key: key,
        state: 'draft',
        data:
          key === 'identification' ?
            { legal_entity_type_id: matrix().legal_entity_type_id }
            // eslint-disable-next-line security/detect-object-injection -- test fixture keys
          : (sections()[key] ?? {}),
      }),
  }),
  relatedPartyMatrixQuery: (bankId: string, type: string) => ({
    queryKey: ['matrix', bankId, type],
    queryFn: () => Promise.resolve(matrix()),
  }),
});

export { MATRICES, routeQueries };
