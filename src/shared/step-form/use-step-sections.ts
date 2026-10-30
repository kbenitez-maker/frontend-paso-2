'use client';

import type { ContractStep } from '@/contracts';
import type { SectionValues, Values } from './block-values';

import { useQueries } from '@tanstack/react-query';

import { contractOf } from '@/contracts';
import { sectionQuery } from '@/server/api';

/**
 * Saved values of every section of a step. Blocks read fields of other
 * sections through visibility conditions, so all of them load together; the
 * cache keeps them fresh as sections are saved.
 */
const useStepSections = (step: ContractStep, requestId: string) => {
  const { sectionKeys } = contractOf(step);

  return useQueries({
    queries: sectionKeys.map((section) =>
      sectionQuery<Values>(requestId, section),
    ),
    combine: (results): { bySection: SectionValues; isLoading: boolean } => ({
      bySection: Object.fromEntries(
        sectionKeys.flatMap((section, index) => {
          // eslint-disable-next-line security/detect-object-injection -- `index` walks the section keys
          const data = results[index]?.data?.data;
          return data === undefined ? [] : [[section, data]];
        }),
      ),
      isLoading: results.some((result) => result.isPending),
    }),
  });
};

export { useStepSections };
