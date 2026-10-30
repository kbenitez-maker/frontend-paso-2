'use client';

import { useMemo } from 'react';

import type {
  AccountOpeningSections,
  OpeningCurrentSection,
  OpeningSectionSummary,
} from '@/server/api';
import type {
  BlockProgress,
  RequestProgress,
  StepProgress,
} from '@/server/api/account-requests';
import type { UseQueryResult } from '@tanstack/react-query';

import { useQueries, useQuery } from '@tanstack/react-query';

import { findStep, STEPS } from '@/lib/constants/steps';
import {
  OPENING_COMPANY_STEP,
  openingAnswerPayload,
  openingBlockOf,
  openingSectionFieldCount,
  openingSectionValues,
  openingStepPercent,
  openingStepState,
} from '@/lib/opening';
import {
  accountOpeningSectionsQuery,
  accountOpeningStepAnswerQuery,
  accountRequestQuery,
} from '@/server/api';

import { useOpeningLiveValues } from '../opening-live-values';
import { usePreviewBank } from '../use-preview-bank';

const COMPANY_STEP = findStep(OPENING_COMPANY_STEP);

interface SectionDetails {
  sections: OpeningCurrentSection[];
  /** Every section detail answered; a pending or failed one leaves counts partial. */
  settled: boolean;
}

const combineDetails = (
  results: UseQueryResult<AccountOpeningSections>[],
): SectionDetails => ({
  sections: results.flatMap((result) =>
    result.data === undefined ? [] : [result.data.current_section],
  ),
  settled: results.every((result) => result.isSuccess),
});

/**
 * Rail progress with the company step counted from the opening-request
 * sections: saved answers, overlaid by the unsaved values of the section on
 * screen. When no section yields counts, the API-provided `progress` is
 * returned unchanged.
 */
const useOpeningCompanyProgress = (
  requestId: string,
  sections: readonly OpeningSectionSummary[],
  progress: RequestProgress | undefined,
): RequestProgress | undefined => {
  const bank = usePreviewBank();
  const details = useQueries({
    queries: sections.map((section) => ({
      ...accountOpeningSectionsQuery(
        requestId,
        OPENING_COMPANY_STEP,
        section.code,
        bank,
      ),
      throwOnError: false,
    })),
    combine: combineDetails,
  });
  const { data: answer } = useQuery({
    ...accountOpeningStepAnswerQuery(requestId, OPENING_COMPANY_STEP, bank),
    throwOnError: false,
  });
  const live = useOpeningLiveValues();
  const { data: request, isPending: requestPending } = useQuery({
    ...accountRequestQuery(requestId),
    throwOnError: false,
  });
  // A request that has not arrived yet is not a request without a bank.
  // Catalogs stay in the count until that is known. A failed request has
  // arrived: there is no bank and no country, so catalogs and phones drop
  // out the same way Continue drops them.
  const answerContext = useMemo(
    () =>
      requestPending ? undefined : (
        {
          bankId: request?.bank_id,
          country: request?.profile?.country,
        }
      ),
    [requestPending, request?.bank_id, request?.profile?.country],
  );

  const counts = useMemo(
    () =>
      details.sections.flatMap((section): BlockProgress[] => {
        const key = openingBlockOf(section.section_code);
        const { completed_fields, total_fields } = openingSectionFieldCount(
          {
            fields: section.fields,
            values:
              live?.sectionCode === section.section_code ?
                live.values
              : {
                  ...section.values,
                  ...openingSectionValues(
                    openingAnswerPayload(answer),
                    section.section_code,
                    section.fields,
                  ),
                },
          },
          answerContext,
        );
        if (key === undefined || total_fields === 0) return [];
        return [{ key, completed_fields, total_fields }];
      }),
    [details.sections, answer, live, answerContext],
  );

  return useMemo(() => {
    if (counts.length === 0) return progress;
    const state = openingStepState(counts);
    const company: StepProgress = {
      slug: COMPANY_STEP.slug,
      state: state === 'complete' && !details.settled ? 'in_progress' : state,
      blocks: counts,
    };
    const steps = progress?.steps ?? [];
    return {
      // The server percent already covers the other steps. The company share
      // is only the fallback while that progress has not arrived.
      percent:
        progress?.percent ??
        Math.round(openingStepPercent(counts) / STEPS.length),
      steps:
        steps.some((step) => step.slug === COMPANY_STEP.slug) ?
          steps.map((step) =>
            step.slug === COMPANY_STEP.slug ? company : step,
          )
        : [company, ...steps],
    };
  }, [counts, details.settled, progress]);
};

export { useOpeningCompanyProgress };
