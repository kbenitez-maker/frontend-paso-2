'use client';

import { useMemo } from 'react';

import type { BlockOf } from '@/lib/constants/steps';
import type { OpeningSectionSummary } from '@/server/api';

import { useQuery } from '@tanstack/react-query';

import { OPENING_COMPANY_STEP, openingCompanyBlocks } from '@/lib/opening';
import { accountOpeningSectionsQuery } from '@/server/api';

import { usePreviewBank } from '../use-preview-bank';

const NO_SECTIONS: readonly OpeningSectionSummary[] = [];

interface OpeningCompanyBlocks {
  /** Company sections of the opening-request overview; empty while it loads or fails. */
  sections: readonly OpeningSectionSummary[];
  /** Rail blocks of those sections, in API order. */
  blocks: readonly BlockOf<'company'>[];
  /** True until the overview answers or fails. */
  isPending: boolean;
  /** True when the overview failed. The registry blocks then apply. */
  isError: boolean;
}

/**
 * Company blocks the opening-request API lists. The rail and the footer read
 * the same query, so navigation follows the blocks the rail shows. A failure
 * leaves both empty and the registry blocks apply.
 */
const useOpeningCompanyBlocks = (requestId: string): OpeningCompanyBlocks => {
  const bank = usePreviewBank();
  const { data, isPending, isError } = useQuery({
    ...accountOpeningSectionsQuery(
      requestId,
      OPENING_COMPANY_STEP,
      undefined,
      bank,
    ),
    throwOnError: false,
  });
  const sections = useMemo(
    () =>
      data?.steps.find((step) => step.code === OPENING_COMPANY_STEP)
        ?.sections ?? NO_SECTIONS,
    [data],
  );
  const blocks = useMemo(() => openingCompanyBlocks(sections), [sections]);
  return { sections, blocks, isPending, isError };
};

export { useOpeningCompanyBlocks };
