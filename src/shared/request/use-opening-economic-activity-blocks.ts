'use client';

import { useMemo } from 'react';

import type { BlockOf } from '@/lib/constants/steps';
import type { OpeningSectionSummary } from '@/server/api';

import { useQuery } from '@tanstack/react-query';

import {
  OPENING_ECONOMIC_ACTIVITY_STEP,
  openingEconomicActivityBlocks,
} from '@/lib/opening';
import { accountOpeningSectionsQuery } from '@/server/api';

import { usePreviewBank } from './use-preview-bank';

const NO_SECTIONS: readonly OpeningSectionSummary[] = [];

interface OpeningEconomicActivityBlocks {
  /** Economic-activity sections of the opening-request overview. */
  sections: readonly OpeningSectionSummary[];
  /** Rail blocks of those sections, in API order. */
  blocks: readonly BlockOf<'economic-activity'>[];
}

/**
 * Economic-activity blocks the opening-request API lists. The rail and the
 * footer read the same query. A failure leaves both empty and the registry
 * blocks apply.
 */
const useOpeningEconomicActivityBlocks = (
  requestId: string,
): OpeningEconomicActivityBlocks => {
  const bank = usePreviewBank();
  const { data } = useQuery({
    ...accountOpeningSectionsQuery(
      requestId,
      OPENING_ECONOMIC_ACTIVITY_STEP,
      undefined,
      bank,
    ),
    throwOnError: false,
  });
  const sections = useMemo(
    () =>
      data?.steps.find((step) => step.code === OPENING_ECONOMIC_ACTIVITY_STEP)
        ?.sections ?? NO_SECTIONS,
    [data],
  );
  const blocks = useMemo(
    () => openingEconomicActivityBlocks(sections),
    [sections],
  );
  return { sections, blocks };
};

export { useOpeningEconomicActivityBlocks, type OpeningEconomicActivityBlocks };
