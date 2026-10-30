'use client';

import { useEffect, useState } from 'react';

import type {
  OPENING_COMPANY_STEP,
  OPENING_ECONOMIC_ACTIVITY_STEP,
} from '@/lib/opening';
import type { OpeningCurrentSection } from '@/server/api';
import type { UseFormReturn } from 'react-hook-form';

import { MutationObserver, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { toast } from '@lafise/onyx-ui/status/toast';

import { fieldErrorsOf } from '@/lib/http/field-errors';
import {
  flattenOpeningFields,
  isOpeningFieldVisible,
  mergeOpeningSectionValues,
  missingOpeningRequiredFields,
  savableAnswerPayload,
} from '@/lib/opening';
import {
  accountOpeningStepAnswerQuery,
  upsertAccountOpeningStepAnswerMutation,
} from '@/server/api';
import { useAutosaveReporter } from '@/shared/request/autosave-state';
import { useAutosave } from '@/shared/request/use-autosave';

import { enqueueOpeningStepSave } from './opening-step-queue';

type Values = Record<string, unknown>;

interface UseOpeningSectionSaveOptions {
  requestId: string;
  /** Step from the route. The save must not guess it from the API string. */
  stepCode: typeof OPENING_COMPANY_STEP | typeof OPENING_ECONOMIC_ACTIVITY_STEP;
  /** Local preview bank. Keeps this step's cached answer apart from another country. */
  previewBank?: string | undefined;
  section: OpeningCurrentSection;
  form: UseFormReturn<Values>;
  /** Absent when the request has no bank. Catalogs then cannot load. */
  bankId: string | undefined;
  /** Absent when the request has no country. Phone fields then cannot render. */
  country: string | undefined;
}

/**
 * Persistence of one opening-request section inside its step answer. Edits
 * are autosaved after a pause; `continueSection` stops on empty required
 * fields, saves, and tells the footer whether it may navigate.
 */
const useOpeningSectionSave = ({
  requestId,
  stepCode,
  previewBank,
  section,
  form,
  bankId,
  country,
}: UseOpeningSectionSaveOptions) => {
  const client = useQueryClient();
  const reporter = useAutosaveReporter();
  const t = useTranslations('Form.saveFailed');
  const tHidden = useTranslations('Form.hiddenFieldError');
  const [isPending, setIsPending] = useState(false);

  // The PUT replaces the whole payload: read the latest answer first, and
  // queue the write so the next save of this step reads it after it landed.
  const save = () => {
    // A local preview reads another request. Writing would store that payload
    // on the request in the URL.
    if (previewBank !== undefined) return Promise.resolve(undefined);
    return enqueueOpeningStepSave(requestId, stepCode, async () => {
      const answerQuery = accountOpeningStepAnswerQuery(
        requestId,
        stepCode,
        previewBank,
      );
      const answer = await client.query({ ...answerQuery, staleTime: 0 });
      const saved = await new MutationObserver(
        client,
        upsertAccountOpeningStepAnswerMutation(requestId, stepCode),
      ).mutate({
        payload: mergeOpeningSectionValues(
          savableAnswerPayload(answer),
          section.section_code,
          section.fields,
          form.getValues(),
        ),
        completed_at: answer.completed_at ?? null,
      });
      client.setQueryData(answerQuery.queryKey, saved);
    });
  };

  const { markDirty, cancel } = useAutosave(save);

  // react-hook-form 7.84 calls this only when values change. setError does
  // not, so a rejected field cannot schedule another save from here.
  useEffect(() => {
    const subscription = form.watch(() => {
      markDirty(section.section_code);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form, markDirty, section.section_code]);

  const continueSection = async (): Promise<boolean> => {
    const missing = missingOpeningRequiredFields(
      {
        fields: section.fields,
        values: form.getValues(),
        step_code: section.step_code,
      },
      { bankId, country },
    );
    for (const code of missing) {
      form.setError(code, { type: 'required', message: 'required' });
    }
    if (missing.length > 0) return false;

    cancel();
    setIsPending(true);
    reporter.saving();
    try {
      await save();
      reporter.saved();
      return true;
    } catch (error) {
      reporter.failed();
      const rejected = fieldErrorsOf(error);
      const visible = new Set(
        flattenOpeningFields(section.fields)
          .filter((field) => isOpeningFieldVisible(field, form.getValues()))
          .map((field) => field.code),
      );
      for (const { field, code } of rejected) {
        form.setError(field, { type: 'server', message: code });
      }
      // An error on a field that is not rendered never reaches an input, so
      // Continue would stop with no explanation.
      if (
        rejected.length > 0 &&
        rejected.every(({ field }) => !visible.has(field))
      ) {
        toast.error({
          heading: tHidden('title'),
          description: tHidden('description'),
        });
      }
      // A field error stays on its input, or on the toast above when none of
      // those fields are rendered. Queuing the save again would repeat the
      // PUT. A payload that is not an object fails the same way on every retry.
      if (rejected.length === 0) {
        if (!(error instanceof TypeError)) {
          markDirty(section.section_code);
        }
        toast.error({ heading: t('title'), description: t('description') });
      }
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { continueSection, isPending };
};

export { useOpeningSectionSave, type UseOpeningSectionSaveOptions };
