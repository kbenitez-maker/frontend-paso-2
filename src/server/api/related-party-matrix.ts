import type { BankId } from '@/types/domain';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/**
 * Registration route of the company (POC socios-relacionados.ts): `A` has a shareholding
 * structure, `B` has none (associations, public bodies), `C` is a trust.
 */
type RegistrationRoute = 'A' | 'B' | 'C';

/** A role the section must register, with the positions someone must hold within it. */
interface RequiredRole {
  /** Code of the section's role catalog (`related-party-roles`, `trust-administration-roles`, ...). */
  role_id: string;
  /** Codes of `board-positions` / `administrative-positions` the role needs covered; empty when none. */
  position_ids: string[];
}

/** A related-parties section the company fills, with the roles it cannot be completed without. */
interface MatrixSection {
  /** Section key; also the block of the related-parties step. */
  key: string;
  required_roles: RequiredRole[];
}

/**
 * Entry of the regional related-parties matrix for (bank, legal entity type).
 * `route: null` means the type has no entry: registration stops and an
 * executive contacts the applicant (POC Sad Path 4); `sections` is then empty.
 */
interface RelatedPartyMatrix {
  legal_entity_type_id: string;
  route: RegistrationRoute | null;
  sections: MatrixSection[];
}

const relatedPartyMatrixQuery = (bankId: BankId, legalEntityTypeId: string) =>
  queryAdapter.query<RelatedPartyMatrix>({
    queryKey: queryKeys.relatedPartyMatrix(bankId, legalEntityTypeId),
    url: endpoints.relatedPartyMatrix(bankId),
    options: {
      apiVersion: APIVersion.V1,
      params: { legal_entity_type_id: legalEntityTypeId },
    },
  });

export {
  relatedPartyMatrixQuery,
  type MatrixSection,
  type RegistrationRoute,
  type RelatedPartyMatrix,
  type RequiredRole,
};
