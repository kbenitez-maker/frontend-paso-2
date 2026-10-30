'use client';

import type { UpdateProfilingBody } from '@/server/api';
import type { ProfileValues } from '@/shared/request/profiling-card';
import type { UseFormReturn } from 'react-hook-form';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';

import { toast } from '@lafise/onyx-ui/status/toast';

import { queryKeys } from '@/lib/constants/query-keys';
import { fieldErrorsOf } from '@/lib/http/field-errors';
import { updateProfilingMutation } from '@/server/api';
import { profileSchema } from '@/shared/request/profiling-card';
import { useRegisterStepGate } from '@/shared/request/step-gate';

/** Answers the applicant may change once the request exists. */
const EDITABLE = ['legal_name', 'annual_sales_usd', 'branch_id'] as const;

interface UseProfileGateOptions {
  requestId: string;
  form: UseFormReturn<ProfileValues>;
  /** Something else is writing (a reclassification): hold the footer. */
  isBusy: boolean;
}

/** "Continue" saves the changed base data (PATCH) and lets the footer go on to the base documents. */
const useProfileGate = ({ requestId, form, isBusy }: UseProfileGateOptions) => {
  const t = useTranslations('Profile');
  const queryClient = useQueryClient();
  const update = useMutation(updateProfilingMutation(requestId));
  const values = useWatch({ control: form.control });
  const isPending = isBusy || update.isPending;

  const save = async (): Promise<boolean> => {
    const current = form.getValues();
    const body: UpdateProfilingBody = Object.fromEntries(
      EDITABLE.filter((key) => form.getFieldState(key).isDirty).map((key) => [
        key,
        form.getValues(key),
      ]),
    );
    if (Object.keys(body).length === 0) return true;

    try {
      await update.mutateAsync(body);
      form.reset(current);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.accountRequests.detail(requestId),
      });
      return true;
    } catch (error) {
      const rejected = fieldErrorsOf(error);
      for (const { field, code } of rejected) {
        const name = profileSchema.keyof().safeParse(field);
        if (name.success) {
          form.setError(name.data, { type: 'server', message: code });
        }
      }
      if (rejected.length === 0) {
        toast.error({
          heading: t('saveFailed.title'),
          description: t('saveFailed.description'),
        });
      }
      return false;
    }
  };

  useRegisterStepGate({
    canContinue: !isPending && profileSchema.safeParse(values).success,
    isPending,
    onContinue: save,
  });
};

export { useProfileGate };
