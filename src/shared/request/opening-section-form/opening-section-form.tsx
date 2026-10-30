'use client';

import type { ReactNode } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { HttpException, StatusCodes } from '@lafise/lde-web-lib';
import { Text } from '@lafise/onyx-ui/typography/text';

import { isBlockOf } from '@/lib/constants/steps';
import { shouldRouteQueryErrorToPage } from '@/lib/http/error-router';
import {
  OPENING_COMPANY_STEP,
  OPENING_ECONOMIC_ACTIVITY_STEP,
  openingAnswerPayload,
  openingSectionCodeOf,
  openingSectionValues,
} from '@/lib/opening';
import {
  accountOpeningSectionsQuery,
  accountOpeningStepAnswerQuery,
  accountRequestQuery,
} from '@/server/api';
import { ErrorState } from '@/shared/error/error-state';
import { useCurrentStep } from '@/shared/request/use-current-step';
import { usePreviewBank } from '@/shared/request/use-preview-bank';

import { OpeningSectionFields } from './opening-section-fields';

interface OpeningSectionFormProps {
  requestId: string;
  /** Leading icons keyed by field code. Steps that have none omit this. */
  icons?: ReadonlyMap<string, ReactNode> | undefined;
}

const statusOf = (error: unknown): number | undefined => {
  if (error instanceof HttpException) return error.status;
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return undefined;
};

/**
 * A 500 or a dropped connection stays on the section so it can be retried.
 * 401 and 404 still go to the error page.
 */
const SERVER_ERROR: number = StatusCodes.INTERNAL_SERVER_ERROR;

const sectionErrorStaysInline = (error: unknown): boolean => {
  const status = statusOf(error);
  if (status === undefined) return true;
  return status >= SERVER_ERROR;
};

/**
 * One section of an opening-request step. The rail's `?block=` picks the
 * section. Company and economic activity read the opening-request API; every
 * other step keeps its own form. Nothing renders until the section loads. A
 * 404 goes to the error page; a 500 or a dropped connection stays here with
 * a retry.
 */
const OpeningSectionForm = ({
  requestId,
  icons,
}: Readonly<OpeningSectionFormProps>) => {
  const { step, block } = useCurrentStep();
  const bank = usePreviewBank();
  const preview = useTranslations('Form.preview');
  const openingStep =
    (
      step?.slug === OPENING_COMPANY_STEP ||
      step?.slug === OPENING_ECONOMIC_ACTIVITY_STEP
    ) ?
      step.slug
    : undefined;
  const openingBlock =
    openingStep !== undefined && isBlockOf(openingStep, block) ?
      block
    : undefined;
  const sectionCode =
    (
      openingStep === OPENING_COMPANY_STEP &&
      isBlockOf(OPENING_COMPANY_STEP, openingBlock)
    ) ?
      openingSectionCodeOf(openingBlock)
    : openingBlock;
  const sections = accountOpeningSectionsQuery(
    requestId,
    openingStep ?? OPENING_COMPANY_STEP,
    sectionCode,
    bank,
  );
  const sectionQuery = useQuery({
    ...sections,
    queryFn:
      sectionCode === undefined ? skipToken : (sections.queryFn ?? skipToken),
    throwOnError: (error) =>
      shouldRouteQueryErrorToPage(error) && !sectionErrorStaysInline(error),
  });
  const requestQuery = useQuery({
    ...accountRequestQuery(requestId),
    throwOnError: false,
  });
  // Without the saved answer the section still opens from its own values.
  const answer = accountOpeningStepAnswerQuery(
    requestId,
    openingStep ?? OPENING_COMPANY_STEP,
    bank,
  );
  const answerQuery = useQuery({
    ...answer,
    queryFn:
      openingBlock === undefined ? skipToken : (answer.queryFn ?? skipToken),
    throwOnError: false,
  });
  const section = sectionQuery.data?.current_section;

  if (openingStep === undefined || openingBlock === undefined) return null;
  if (
    sectionQuery.isPending ||
    answerQuery.isPending ||
    requestQuery.isPending
  ) {
    return null;
  }
  if (sectionQuery.isError) {
    return <ErrorState onRetry={() => void sectionQuery.refetch()} />;
  }
  if (section === undefined) return null;

  return (
    <>
      {bank === undefined ? null : (
        <Text size='sm' role='status'>
          {preview('readOnly')}
        </Text>
      )}
      <OpeningSectionFields
        key={section.section_code}
        requestId={requestId}
        stepCode={openingStep}
        previewBank={bank}
        section={section}
        block={openingBlock}
        savedValues={openingSectionValues(
          openingAnswerPayload(answerQuery.data),
          section.section_code,
          section.fields,
        )}
        bankId={requestQuery.data?.bank_id}
        country={requestQuery.data?.profile?.country}
        icons={icons}
      />
    </>
  );
};

export { OpeningSectionForm, type OpeningSectionFormProps };
