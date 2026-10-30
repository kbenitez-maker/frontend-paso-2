'use client';

import { useMemo } from 'react';

import type { CreateAccountRequestBody } from '@/server/api';
import type { ProfileValues } from '@/shared/request/profiling-card';
import type { BankId, CountryCode } from '@/types/domain';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { profileSchema, ProfilingCard } from '@/shared/request/profiling-card';

import { ReclassificationModal } from '../reclassification-modal';
import { useProfileGate } from './use-profile-gate';
import { useReclassification } from './use-reclassification';

interface ProfileFormProps {
  requestId: string;
  bankId: BankId;
  country: CountryCode;
  profiling: CreateAccountRequestBody;
}

/**
 * The profiling card in its second moment (POC perfil once verified): base
 * data editable and saved on "Continue"; a new legal entity type is confirmed
 * and applied at once as a reclassification (POC CA 6 of ITDFCJ-44).
 */
const ProfileForm = ({
  requestId,
  bankId,
  country,
  profiling,
}: Readonly<ProfileFormProps>) => {
  const form = useForm<ProfileValues>({
    defaultValues: profiling,
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
  });
  const reclassification = useReclassification(requestId, form);
  useProfileGate({
    requestId,
    form,
    isBusy: reclassification.isPending,
  });

  const { start } = reclassification;
  const profilingContext = useMemo(
    () => ({
      bankId,
      country,
      moment: 'base-data' as const,
      onEntityTypeChange: start,
    }),
    [bankId, country, start],
  );

  return (
    <FormProvider {...form}>
      <ProfilingCard.Provider value={profilingContext}>
        <ProfilingCard>
          <ProfilingCard.Identification />
          <ProfilingCard.BaseData />
        </ProfilingCard>
      </ProfilingCard.Provider>

      {reclassification.pending === null ? null : (
        <ReclassificationModal
          bankId={bankId}
          change={reclassification.pending}
          isPending={reclassification.isPending}
          onConfirm={reclassification.confirm}
          onCancel={reclassification.cancel}
        />
      )}
    </FormProvider>
  );
};

export { ProfileForm, type ProfileFormProps };
