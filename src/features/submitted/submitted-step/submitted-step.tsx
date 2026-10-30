'use client';

import { useSearchParams } from 'next/navigation';

import type { RequestStatus } from '@/types/request';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { ApprovalProgressLeading } from '@lafise/lde-web-core';
import { Check, Document } from '@lafise/onyx-icons';
import { Card } from '@lafise/onyx-ui/data-display/card';
import { Status } from '@lafise/onyx-ui/data-display/status';
import { Text } from '@lafise/onyx-ui/typography/text';

import {
  MILESTONES_BY_STATUS,
  TOTAL_MILESTONES,
} from '@/lib/constants/milestones';
import { accountRequestQuery } from '@/server/api';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { submittedStepTheme } from './themes';

const { card, headline, description, closing, ring, meta, reference } =
  submittedStepTheme();

/** Amber while the applicant owns it, blue while the bank works, green once opened, grey once lost. */
const STATUS_TONES: Readonly<
  Record<RequestStatus, 'pending' | 'sent' | 'completed' | 'inactive'>
> = {
  draft: 'pending',
  returned_to_client: 'pending',
  submitted: 'sent',
  in_review: 'sent',
  paused_compliance: 'sent',
  bank_documents_generated: 'sent',
  approved: 'completed',
  account_opened: 'completed',
  rejected: 'inactive',
  cancelled: 'inactive',
};

interface SubmittedStepProps {
  requestId: string;
}

/**
 * Closing screen once the request is with the bank (POC encuesta, sent
 * state; ITDFCJ-51 CA-1): the milestone ring with the status and the request
 * number, so the applicant leaves knowing where it stands and what to quote.
 * The flow footer's only way on is the requests list.
 */
const SubmittedStep = ({ requestId }: Readonly<SubmittedStepProps>) => {
  const t = useTranslations('Submitted');
  const rated = useSearchParams().get('rated') !== null;
  const { data: request } = useQuery(accountRequestQuery(requestId));
  useRegisterStepGate({
    canContinue: true,
    isPending: false,
    nextLabel: t('goToRequests'),
    onContinue: () => Promise.resolve(true),
  });

  return (
    <Card className={card()}>
      <Card.Indicator>
        <Check size='md' />
      </Card.Indicator>

      <Card.Header>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='md'>
            {t('title')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t(rated ? 'thanks' : 'next')}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      {request === undefined ? null : (
        <Card.Body className={closing()}>
          <ApprovalProgressLeading
            progress={MILESTONES_BY_STATUS[request.status] / TOTAL_MILESTONES}
            color='primary'
            direction='clockwise'
            aria-label={t('progressLabel')}
            className={ring()}
          >
            <ApprovalProgressLeading.Avatar>
              <Document size='sm' />
            </ApprovalProgressLeading.Avatar>
            <ApprovalProgressLeading.Label />
          </ApprovalProgressLeading>

          <div className={meta()}>
            <Status status={STATUS_TONES[request.status]}>
              {t(`status.${request.status}`)}
            </Status>
            <Text size='sm' className={reference()}>
              {t('reference', {
                number: request.request_number,
                milestones: TOTAL_MILESTONES,
              })}
            </Text>
          </div>
        </Card.Body>
      )}
    </Card>
  );
};

export { SubmittedStep, type SubmittedStepProps };
