'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import type { BankDocumentsPhase } from '@/server/api';
import type { ComponentType } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Bank, Edit, Lock, Warning } from '@lafise/onyx-icons';
import { Card } from '@lafise/onyx-ui/data-display/card';
import { EmptyState } from '@lafise/onyx-ui/data-display/empty-state';
import { Status } from '@lafise/onyx-ui/data-display/status';
import { Notification } from '@lafise/onyx-ui/status/notification';
import { toast } from '@lafise/onyx-ui/status/toast';

import { DocumentCards } from '@/features/base-documents';
import { queryKeys } from '@/lib/constants/query-keys';
import { routes } from '@/lib/routes';
import { bankDocumentsQuery, submitAccountRequestMutation } from '@/server/api';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { Milestones } from '../milestones';
import { bankDocumentsBlockTheme } from './themes';

const { card, header, headline, description, body, empty, milestones } =
  bankDocumentsBlockTheme();

interface BankDocumentsBlockProps {
  requestId: string;
}

interface PhaseView {
  /** Grey while it does not exist yet, blue while the bank has it, amber when the ball is back with the applicant. */
  status: 'inactive' | 'sent' | 'pending';
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg' }>;
}

const PHASES: Readonly<Record<BankDocumentsPhase, PhaseView>> = {
  locked: { status: 'inactive', icon: Lock },
  in_review: { status: 'sent', icon: Bank },
  available: { status: 'pending', icon: Edit },
  returned: { status: 'pending', icon: Warning },
};

/** How often the screen asks whether the bank published, while it reviews. */
const REVIEW_POLL_MS = 60_000;

/**
 * Bank documents to download, sign and upload back. The title says where the
 * process stands, which is what the applicant came to find out; the cards
 * only exist once the bank publishes the documents, and their arrival (or
 * return) is announced with a toast when the phase changes (POC).
 */
const BankDocumentsBlock = ({
  requestId,
}: Readonly<BankDocumentsBlockProps>) => {
  const t = useTranslations('Signature');
  const router = useRouter();
  const client = useQueryClient();
  const submit = useMutation(submitAccountRequestMutation(requestId));
  const { data } = useQuery({
    ...bankDocumentsQuery(requestId),
    // Nothing pushes the bank's answer: while it reviews, ask again now and then.
    refetchInterval: (query) =>
      query.state.data?.phase === 'in_review' ? REVIEW_POLL_MS : false,
  });
  const announcedRef = useRef<BankDocumentsPhase | undefined>(undefined);
  const phase = data?.phase;

  const published =
    data !== undefined && (phase === 'available' || phase === 'returned');

  // An event, not a state: announced once per phase change (POC `AVISOS`).
  useEffect(() => {
    if (phase === announcedRef.current) return;
    announcedRef.current = phase;
    if (phase === 'available') {
      toast.success({
        heading: t('phases.available.title'),
        description: t('arrival.available'),
      });
    }
    if (phase === 'returned') {
      toast.warning({
        heading: t('phases.returned.title'),
        description: t('phases.returned.detail'),
      });
    }
  }, [phase, t]);
  const returned = data?.items.every(
    (item) => item.files.length > 0 && item.rejection_reason === undefined,
  );

  useRegisterStepGate({
    canContinue: published && data.items.length > 0 && returned === true,
    isPending: submit.isPending,
    nextLabel: t('footer.finish'),
    // The signed files are stored as they are uploaded; finishing hands the
    // request to the bank, and the footer goes on to the survey (ITDFCJ-36 CA-11).
    onContinue: async () => {
      try {
        await submit.mutateAsync(undefined);
        await client.invalidateQueries({
          queryKey: queryKeys.accountRequests.detail(requestId),
        });
        return true;
      } catch {
        toast.error({
          heading: t('submitFailed.title'),
          description: t('submitFailed.description'),
        });
        return false;
      }
    },
  });

  if (data === undefined) return null;

  const { status, icon: Icon } = PHASES[data.phase];

  return (
    <Card className={card()}>
      <Card.Indicator>
        <Icon size='md' />
      </Card.Indicator>

      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='lg'>
            {t(`phases.${data.phase}.title`)}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t(`phases.${data.phase}.detail`)}
          </Card.Description>
        </Card.Headline>

        {/* While unpublished the milestones below already say where it stands. */}
        {published ?
          <Status status={status}>{t(`phases.${data.phase}.label`)}</Status>
        : null}
      </Card.Header>

      <Card.Body className={body()}>
        {published ?
          <>
            {data.phase === 'returned' ?
              <Notification status='warning'>
                <Notification.Icon />
                <Notification.Content>
                  {t('phases.returned.detail')}
                </Notification.Content>
              </Notification>
            : null}
            <DocumentCards requestId={requestId} items={data.items} />
          </>
        : <EmptyState
            direction='column'
            alignItems='center'
            className={empty()}
          >
            <div className={milestones()}>
              <Milestones />
            </div>

            {/* The only phase with a way out for the applicant is theirs. */}
            {data.phase === 'locked' ?
              <EmptyState.Actions>
                <EmptyState.Action
                  variant='primary'
                  onPress={() => {
                    router.push(routes.step(requestId, 'document-checklist'));
                  }}
                >
                  {t('goToChecklist')}
                </EmptyState.Action>
              </EmptyState.Actions>
            : null}
          </EmptyState>
        }
      </Card.Body>
    </Card>
  );
};

export { BankDocumentsBlock, type BankDocumentsBlockProps };
