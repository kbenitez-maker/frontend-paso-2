'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { documentChecklistQuery } from '@/server/api';
import { useRegisterStepGate } from '@/shared/request/step-gate';
import { STATEMENT_KEYS } from '@/types/request';

import { useConfirmation } from '../lib/use-confirmation';
import { Statements } from '../statements';

interface DeclarationsBlockProps {
  requestId: string;
}

/**
 * Last block of the checklist: the three declarations. Sending the
 * documentation opens once every required document has a file and all three
 * declarations are accepted.
 */
const DeclarationsBlock = ({ requestId }: Readonly<DeclarationsBlockProps>) => {
  const t = useTranslations('DocumentChecklist.declarations');
  const { data: checklist } = useQuery(
    documentChecklistQuery(requestId, 'checklist'),
  );
  const { confirmation } = useConfirmation(requestId);

  const missing = (checklist?.items ?? []).some(
    (item) =>
      item.required && item.from_profile !== true && item.files.length === 0,
  );
  const declared =
    confirmation?.accepted_statements.length === STATEMENT_KEYS.length;

  useRegisterStepGate({
    canContinue: checklist !== undefined && !missing && declared,
    isPending: false,
    nextLabel: t('submit'),
    // Nothing to save: declarations are stored as they change.
    onContinue: () => Promise.resolve(true),
  });

  return <Statements requestId={requestId} />;
};

export { DeclarationsBlock, type DeclarationsBlockProps };
