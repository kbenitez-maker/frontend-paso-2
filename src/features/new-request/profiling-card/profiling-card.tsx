'use client';

import { useMemo } from 'react';

import type { ProfileValues } from '@/shared/request/profiling-card';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';

import { Home } from '@lafise/onyx-icons';

import { routes } from '@/lib/routes';
import { BlockedScreen } from '@/shared/error/blocked-screen';
import { profileSchema, ProfilingCard } from '@/shared/request/profiling-card';

import { useNewRequestBank } from '../new-request-bank';
import { surfaceOf } from './lib/lookup-outcome';
import { RequestInProgressNotice } from './request-in-progress-notice';
import { useProfiling } from './use-profiling';

const DEFAULT_VALUES: Partial<ProfileValues> = {
  identification_type_id: '',
  identification_number: '',
  legal_name: '',
};

/**
 * The profiling card of `/new`. First it only asks for the company's
 * identification; the base data appears once the lookup says the company is
 * new to the bank. A client that already exists ends the digital flow on a
 * full screen instead.
 */
const ProfilingCardRoot = () => {
  const bank = useNewRequestBank();
  const t = useTranslations('NewRequest');
  const form = useForm<ProfileValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
  });
  const { state } = useProfiling(bank, form);
  const profilingContext = useMemo(
    () => ({
      bankId: bank.bank_id,
      country: bank.country,
      moment: state.moment,
    }),
    [bank.bank_id, bank.country, state.moment],
  );
  const surface = state.block === null ? undefined : surfaceOf(state.block);

  if (state.block === 'existing_client' && surface === 'screen') {
    return (
      <BlockedScreen
        title={t('outcomes.existingClient.title')}
        description={t('outcomes.existingClient.message')}
        action={{
          label: t('outcomes.existingClient.action'),
          href: routes.external.requests(),
          icon: <Home size='md' />,
        }}
      />
    );
  }

  return (
    <FormProvider {...form}>
      <ProfilingCard.Provider value={profilingContext}>
        <ProfilingCard>
          {state.block === 'request_in_progress' ?
            <RequestInProgressNotice />
          : null}

          <ProfilingCard.Identification />

          {state.moment === 'base-data' ?
            <ProfilingCard.BaseData />
          : null}
        </ProfilingCard>
      </ProfilingCard.Provider>
    </FormProvider>
  );
};

export { ProfilingCardRoot };
