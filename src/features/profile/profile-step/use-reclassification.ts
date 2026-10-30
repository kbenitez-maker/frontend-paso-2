'use client';

import { useState } from 'react';

import type { Reclassification } from '@/server/api';
import type { ProfileValues } from '@/shared/request/profiling-card';
import type { UseFormReturn } from 'react-hook-form';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { toast } from '@lafise/onyx-ui/status/toast';

import { queryKeys } from '@/lib/constants/query-keys';
import {
  reclassificationPreviewMutation,
  reclassifyMutation,
} from '@/server/api';

/**
 * A new legal entity type is a reclassification (POC CA 6 of ITDFCJ-44): its
 * consequence is asked first, and when it removes people or roles it waits for
 * the applicant's confirmation in `pending`; otherwise it is applied at once.
 * Applying it refreshes everything of the request (route, sections,
 * documents, progress).
 */
const useReclassification = (
  requestId: string,
  form: UseFormReturn<ProfileValues>,
) => {
  const t = useTranslations('Profile.reclassification');
  const queryClient = useQueryClient();
  const preview = useMutation(reclassificationPreviewMutation(requestId));
  const apply = useMutation(reclassifyMutation(requestId));
  const [pending, setPending] = useState<Reclassification | null>(null);

  const fail = () => {
    toast.error({
      heading: t('failed.title'),
      description: t('failed.description'),
    });
  };

  const commit = async (typeId: string) => {
    try {
      await apply.mutateAsync({ legal_entity_type_id: typeId });
      form.setValue('legal_entity_type_id', typeId, { shouldValidate: true });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.accountRequests.detail(requestId),
      });
    } catch {
      fail();
    } finally {
      setPending(null);
    }
  };

  const start = async (typeId: string) => {
    try {
      const change = await preview.mutateAsync({
        legal_entity_type_id: typeId,
      });
      if (change.requires_confirmation) setPending(change);
      else await commit(typeId);
    } catch {
      fail();
    }
  };

  return {
    pending,
    isPending: preview.isPending || apply.isPending,
    start: (typeId: string) => {
      void start(typeId);
    },
    confirm: () => {
      if (pending !== null) void commit(pending.legal_entity_type_after);
    },
    cancel: () => {
      setPending(null);
    },
  };
};

export { useReclassification };
