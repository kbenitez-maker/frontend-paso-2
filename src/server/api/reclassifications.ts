import type { RegistrationRoute } from './related-party-matrix';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/**
 * What a change of the legal entity type does to the related parties (POC
 * reclasificacion.ts): another route empties the old route's sections; another
 * matrix row of the same route takes away the roles it no longer asks for
 * (removing who keeps none); otherwise nothing changes.
 */
type ReclassificationScenario = 'route_change' | 'roles_change' | 'no_effect';

/** A registered related party the change removes, or takes roles from. */
interface AffectedPerson {
  name: string;
  /** Roles taken away (all of the person's when removed). */
  role_ids: string[];
}

/** Where a designation of a related party lives outside the related-parties step. */
type BrokenLinkKind = 'account_signer' | 'card_holder' | 'superuser';

/**
 * A designation left pointing to a person the change removes (POC broken
 * links): it must be made again before the request is submitted.
 */
interface BrokenLink {
  kind: BrokenLinkKind;
  /** 1-based number of the account (signers, card holders) or the superuser. */
  position: number;
  /** Name the designation was saved with. */
  name: string;
}

/**
 * What an applied change left on the request (POC `__reclasificacion`):
 * the related-parties step explains it until the applicant completes what is
 * missing. A change with no effect leaves none (and keeps the previous one).
 */
interface ReclassificationTrace {
  legal_entity_type_before: string;
  legal_entity_type_after: string;
  scenario: Exclude<ReclassificationScenario, 'no_effect'>;
  /** Names of the people removed. */
  removed_people: string[];
  /** Roles the new classification asks for that are still to be registered. */
  roles_added: string[];
  applied_at: string;
}

interface ReclassificationBody {
  /** Code of the `legal-entity-types` catalog row to change to. */
  legal_entity_type_id: string;
}

interface Reclassification {
  scenario: ReclassificationScenario;
  legal_entity_type_before: string;
  legal_entity_type_after: string;
  route_before: RegistrationRoute | null;
  route_after: RegistrationRoute | null;
  /** Roles the previous matrix row asked for and the new one does not. */
  roles_removed: string[];
  /** Roles the new matrix row asks for that are still to be registered. */
  roles_added: string[];
  /** Related-parties sections emptied (their people and the ownership structure go with them). */
  emptied_sections: string[];
  removed_people: AffectedPerson[];
  people_losing_roles: AffectedPerson[];
  /** Account signers, card holders and Bancanet superusers left without their person. */
  broken_links: BrokenLink[];
  /** Form fields (collection item fields included) the type stops or starts asking for. */
  changed_fields: number;
  /** `true` when someone would be removed or lose a role: ask before applying. */
  requires_confirmation: boolean;
}

/** Computes the consequence of the change; nothing is written. */
const reclassificationPreviewMutation = (requestId: string) =>
  queryAdapter.mutation<Reclassification, ReclassificationBody>({
    url: endpoints.accountRequests.reclassificationPreview(requestId),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

/** Applies the change atomically; answers with what it did. */
const reclassifyMutation = (requestId: string) =>
  queryAdapter.mutation<Reclassification, ReclassificationBody>({
    url: endpoints.accountRequests.reclassifications(requestId),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

export {
  reclassificationPreviewMutation,
  reclassifyMutation,
  type AffectedPerson,
  type BrokenLink,
  type BrokenLinkKind,
  type Reclassification,
  type ReclassificationBody,
  type ReclassificationScenario,
  type ReclassificationTrace,
};
