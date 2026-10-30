'use client';

import { useTranslations } from 'next-intl';

import { useRegisterStepGate } from '@/shared/request/step-gate';

import { useConfirmation } from '../lib/use-confirmation';
import { ConfirmFields } from './confirm-fields';
import { ConfirmBlockContext } from './context';
import { SignerCard } from './signer-card';

interface ConfirmBlockProps {
  requestId: string;
}

/** Read-only block of the review: the answers that decide the checklist, each with the way to fix it, and the signer. */
const ConfirmBlockRoot = ({ requestId }: Readonly<ConfirmBlockProps>) => {
  const t = useTranslations('DocumentChecklist.confirm');
  const { confirmation, choose } = useConfirmation(requestId);

  useRegisterStepGate({
    canContinue: confirmation?.signer_id != null,
    isPending: false,
    nextLabel: t('next'),
    // Nothing to save: the signer is stored as it is chosen.
    onContinue: () => Promise.resolve(true),
  });

  if (confirmation === undefined) return null;

  return (
    <ConfirmBlockContext value={{ requestId, confirmation, choose }}>
      <ConfirmFields />
      <SignerCard />
    </ConfirmBlockContext>
  );
};

export { ConfirmBlockRoot, type ConfirmBlockProps };
