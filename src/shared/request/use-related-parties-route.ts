'use client';

import { useMemo } from 'react';

import type { RouteBlock } from '@/lib/related-parties';
import type { RelatedPartyMatrix } from '@/server/api';

import { useQuery } from '@tanstack/react-query';

import { routeBlocks } from '@/lib/related-parties';
import {
  accountRequestQuery,
  relatedPartyMatrixQuery,
  sectionQuery,
} from '@/server/api';
import { mergeSections } from '@/shared/step-form/block-values';
import { useStepSections } from '@/shared/step-form/use-step-sections';

/** A company without a legal entity type has no matrix entry either (POC Sad Path 4). */
const unmapped = (legalEntityTypeId: string): RelatedPartyMatrix => ({
  legal_entity_type_id: legalEntityTypeId,
  route: null,
  sections: [],
});

/**
 * Matrix entry of the request's company and the related-parties blocks it
 * has (with the ones still waiting for an earlier block); both `undefined`
 * while they load. `isError` is a failed request, identification, or matrix:
 * that is not a load, and callers must not wait on `blocks` forever.
 */
const useRelatedPartiesRoute = (requestId: string) => {
  const requestQuery = useQuery({
    ...accountRequestQuery(requestId),
    throwOnError: false,
  });
  const identificationQuery = useQuery({
    ...sectionQuery<Record<string, unknown>>(requestId, 'identification'),
    throwOnError: false,
  });
  const request = requestQuery.data;
  const identification = identificationQuery.data;
  const saved = identification?.data['legal_entity_type_id'];
  const typeId = typeof saved === 'string' ? saved : '';
  const matrixQuery = useQuery({
    ...relatedPartyMatrixQuery(request?.bank_id ?? 'BLNI', typeId),
    enabled: request !== undefined && typeId !== '',
    throwOnError: false,
    staleTime: Infinity,
  });
  const fetched = matrixQuery.data;
  const matrix =
    identification !== undefined && typeId === '' ? unmapped(typeId) : fetched;
  const { bySection, isLoading } = useStepSections(
    'related-parties',
    requestId,
  );

  const blocks = useMemo(
    (): RouteBlock[] | undefined =>
      matrix === undefined || isLoading ?
        undefined
      : routeBlocks(matrix, mergeSections(bySection)),
    [matrix, isLoading, bySection],
  );

  return {
    matrix,
    blocks,
    isError:
      requestQuery.isError ||
      identificationQuery.isError ||
      matrixQuery.isError,
  };
};

export { useRelatedPartiesRoute };
