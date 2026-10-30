'use client';

import { useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Bank } from '@/server/api';
import type { ProfileValues } from '@/shared/request/profiling-card';
import type { UseFormReturn } from 'react-hook-form';
import type { LookupBlock } from './lib/lookup-outcome';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';

import { HttpException } from '@lafise/lde-web-lib';
import { toast } from '@lafise/onyx-ui/status/toast';

import { fieldErrorsOf } from '@/lib/http/field-errors';
import { reportClientFailure } from '@/lib/report-client-failure';
import { routes } from '@/lib/routes';
import {
  createAccountOpeningRequestMutation,
  customerLookupQuery,
  isAccountOpeningRequestCreated,
  isCustomerLookup,
} from '@/server/api';
import {
  bodyOf,
  identificationOf,
  profileSchema,
  schemaOf,
} from '@/shared/request/profiling-card';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { isIdentificationTypeRejected } from './lib/create-failure';
import {
  failureOfError,
  outcomeKeyOf,
  resultOfLookup,
  surfaceOf,
} from './lib/lookup-outcome';
import { INITIAL_PROFILING, profilingReducer } from './lib/profiling-state';

const diagnosticOf = (error: unknown): { code?: string; status?: number } => {
  if (!(error instanceof HttpException)) return {};
  return { code: error.error.code, status: error.status };
};

/**
 * Drives the two moments of `/new`. The footer's "Continue" verifies the
 * company first (the lookup), and once it is new to the bank it creates the
 * request and goes to its base documents. A lookup that fails or is slow never
 * counts as "new to bank".
 */
const useProfiling = (bank: Bank, form: UseFormReturn<ProfileValues>) => {
  const t = useTranslations('NewRequest');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(profilingReducer, INITIAL_PROFILING);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const create = useMutation(createAccountOpeningRequestMutation());
  const values = useWatch({ control: form.control });

  // After a successful create the screen is leaving: keep the button busy until it does.
  const isPending = isLookingUp || create.isPending || create.isSuccess;

  const toastBlock = (block: LookupBlock) => {
    if (surfaceOf(block) !== 'toast') return;
    const key = outcomeKeyOf(block);
    toast.error({
      heading: t(`outcomes.${key}.title`),
      description: t(`outcomes.${key}.message`),
    });
  };

  const verify = async () => {
    const identification = identificationOf(form.getValues());
    if (identification === undefined) return;

    dispatch({ type: 'retry' });
    setIsLookingUp(true);
    try {
      const answer: unknown = await queryClient.query(
        customerLookupQuery(bank.bank_id, identification.identification_number),
      );
      if (!isCustomerLookup(answer)) {
        reportClientFailure({
          message: 'customer lookup response was not a lookup',
          bankId: bank.bank_id,
        });
        dispatch({ type: 'lookup-failed', block: 'unavailable' });
        toastBlock('unavailable');
        return;
      }
      const result = resultOfLookup(answer);
      dispatch({ type: 'lookup-answered', result });
      if (!result.proceed) toastBlock(result.block);
    } catch (error) {
      const block = failureOfError(error);
      reportClientFailure({
        message: 'customer lookup failed',
        bankId: bank.bank_id,
        block,
        ...diagnosticOf(error),
      });
      dispatch({ type: 'lookup-failed', block });
      toastBlock(block);
    } finally {
      setIsLookingUp(false);
    }
  };

  const toastCreateFailed = () => {
    toast.error({
      heading: t('createFailed.title'),
      description: t('createFailed.description'),
    });
  };

  const createRequest = async () => {
    const profile = bodyOf(form.getValues());
    if (profile === undefined) return;

    try {
      const created: unknown = await create.mutateAsync({
        bank_id: bank.bank_id,
        legal_name: profile.legal_name,
        identification_number: profile.identification_number,
        identification_type_code: profile.identification_type_id,
        entity_type_code: profile.legal_entity_type_id,
        annual_sales_usd: profile.annual_sales_usd,
        branch_code: profile.branch_id,
      });
      if (!isAccountOpeningRequestCreated(created)) {
        reportClientFailure({
          message: 'account opening response was not a draft',
          bankId: bank.bank_id,
        });
        globalThis.location.assign(routes.external.requests());
        return;
      }
      router.push(routes.baseDocuments(created.request_id));
    } catch (error) {
      reportClientFailure({
        message: 'account opening request failed',
        bankId: bank.bank_id,
        ...diagnosticOf(error),
      });
      const rejected = fieldErrorsOf(error);
      for (const { field, code } of rejected) {
        const name = profileSchema.keyof().safeParse(field);
        if (name.success) {
          form.setError(name.data, { type: 'server', message: code });
        }
      }
      if (rejected.length > 0) return;
      if (isIdentificationTypeRejected(error)) {
        form.setError('identification_type_id', {
          type: 'server',
          message: 'invalid',
        });
        return;
      }
      toastCreateFailed();
    }
  };

  useRegisterStepGate({
    canContinue: !isPending && schemaOf(state.moment).safeParse(values).success,
    isPending,
    nextLabel: state.moment === 'identify' ? t('footer.verify') : undefined,
    // Both moments move the screen themselves, so the footer never navigates.
    onContinue: async () => {
      await (state.moment === 'identify' ? verify() : createRequest());
      return false;
    },
  });

  return { state };
};

export { useProfiling };
