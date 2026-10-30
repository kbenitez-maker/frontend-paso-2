'use client';

import type { ConfirmationChoices } from '@/server/api';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { toast } from '@lafise/onyx-ui/status/toast';

import { queryKeys } from '@/lib/constants/query-keys';
import { confirmationQuery, saveConfirmationMutation } from '@/server/api';

/**
 * The review of the request and the way to change the applicant's choices
 * (signer, accepted statements). Each change is saved at once and the stored
 * review replaces the cached one.
 */
const useConfirmation = (requestId: string) => {
  const t = useTranslations('DocumentChecklist.errors.saveFailed');
  const client = useQueryClient();
  const { data: confirmation } = useQuery(confirmationQuery(requestId));
  const save = useMutation({
    ...saveConfirmationMutation(requestId),
    onSuccess: (stored) => {
      client.setQueryData(
        queryKeys.accountRequests.confirmation(requestId),
        stored,
      );
    },
    onError: () => {
      toast.error({ heading: t('title'), description: t('description') });
    },
  });

  const choose = (change: Partial<ConfirmationChoices>) => {
    if (confirmation === undefined) return;
    save.mutate({
      signer_id: confirmation.signer_id,
      accepted_statements: confirmation.accepted_statements,
      ...change,
    });
  };

  return { confirmation, choose, isSaving: save.isPending };
};

export { useConfirmation };
