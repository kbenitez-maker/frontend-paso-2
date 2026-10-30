import type { OwnershipConfirmation, Route } from '@/lib/ownership';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/** A natural person of the structure with their total participation (ITDFCJ-47 CA 2 and 6). */
interface OwnershipBeneficiary {
  /** Identification type and number (`<type>|<number>`, lowercase): the person's identity. */
  document: string;
  name: string;
  /** Level of their principal record (highest-level appearance). */
  level: number;
  /** Sum of every route, rounded to hundredths. */
  total: number;
  /** At or above the threshold (inclusive). */
  beneficial: boolean;
  /** Each route from the holder, with the part of every link. */
  routes: Route[];
}

/**
 * Ownership structure of the request (POC resumen-estructura.tsx). The stored
 * confirmation seals the structure (no adding or removing shareholders) and
 * is stale (`current: false`) once the shareholders change after it; the
 * beneficiaries come only with a current confirmation.
 */
interface OwnershipStructure {
  /** Participation threshold of the bank, in percent (inclusive). */
  threshold: number;
  confirmation: OwnershipConfirmation | null;
  current: boolean;
  beneficiaries: OwnershipBeneficiary[];
}

const ownershipStructureQuery = (requestId: string) =>
  queryAdapter.query<OwnershipStructure>({
    queryKey: queryKeys.accountRequests.ownershipStructure(requestId),
    url: endpoints.accountRequests.ownershipStructure(requestId),
    options: { apiVersion: APIVersion.V1 },
  });

/**
 * Runs the calculation on the saved shareholders and seals the structure;
 * `422` names what keeps it from being confirmed.
 */
const confirmOwnershipMutation = (requestId: string) =>
  queryAdapter.mutation<OwnershipStructure, undefined>({
    url: endpoints.accountRequests.ownershipConfirmation(requestId),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

/** Reopens the structure: the confirmation and its beneficial owner marks are removed. */
const reopenOwnershipMutation = (requestId: string) =>
  queryAdapter.mutation<OwnershipStructure, undefined>({
    url: endpoints.accountRequests.ownershipConfirmation(requestId),
    method: 'delete',
    options: { apiVersion: APIVersion.V1 },
  });

export {
  confirmOwnershipMutation,
  ownershipStructureQuery,
  reopenOwnershipMutation,
  type OwnershipBeneficiary,
  type OwnershipStructure,
};
