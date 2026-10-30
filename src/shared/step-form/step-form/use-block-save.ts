'use client';

import { useEffect, useRef, useState } from 'react';

import type { CountryCode } from '@/types/domain';
import type { UseFormReturn } from 'react-hook-form';
import type { BlockField } from '../block-fields';
import type { SectionValues, Values } from '../block-values';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { toast } from '@lafise/onyx-ui/status/toast';

import { fieldErrorsOf } from '@/lib/http/field-errors';
import { useAutosaveReporter } from '@/shared/request/autosave-state';
import { useAutosave } from '@/shared/request/use-autosave';

import { sectionsOf, valueKey } from '../block-fields';
import { draftValues, isSectionComplete } from '../block-validation';
import {
  contextOf,
  mergeSections,
  normalizeValues,
  sectionBody,
} from '../block-values';
import { saveSection } from '../save-section';

interface UseBlockSaveOptions {
  requestId: string;
  country: CountryCode;
  fields: readonly BlockField[];
  bySection: SectionValues;
  form: UseFormReturn<Values>;
  /** Values the conditions read that no section holds. */
  external?: Values | undefined;
}

// ponytail: deferred on purpose, it needs a backend contract that does not exist yet
// (prohibited countries no longer pause: they are an inline error, rule `not_prohibited`):
// - "Save and exit" flush: the close dialog lives in the layout and does not know this hook;
//   until then autosave also flushes when the step unmounts, which covers navigation.

/**
 * Persistence of one block. Edits are autosaved as drafts after a pause;
 * `continueBlock` saves the block's sections for real (complete when the whole
 * section already validates) and tells the footer whether it may navigate.
 */
const useBlockSave = ({
  requestId,
  country,
  fields,
  bySection,
  form,
  external,
}: UseBlockSaveOptions) => {
  const client = useQueryClient();
  const reporter = useAutosaveReporter();
  const t = useTranslations('Form.saveFailed');
  const [isPending, setIsPending] = useState(false);

  // Saves read the newest server values without being re-created on every save.
  const latestRef = useRef({ bySection });
  useEffect(() => {
    latestRef.current = { bySection };
  });

  const bodies = () => {
    const current = latestRef.current.bySection;
    const context = { ...contextOf(current, fields), ...external };
    const normalized = normalizeValues(
      fields,
      form.getValues(),
      context,
      country,
    );
    return { current, context, normalized };
  };

  const saveDrafts = async (sections: string[]) => {
    const { current, context, normalized } = bodies();
    const safe = draftValues(fields, normalized, context, country);
    for (const section of sectionsOf(fields)) {
      if (!sections.includes(section)) continue;
      await saveSection(
        client,
        requestId,
        section,
        'draft',
        sectionBody(section, fields, current, safe),
      );
    }
  };

  const { markDirty, cancel } = useAutosave(saveDrafts);

  useEffect(() => {
    const subscription = form.watch((_values, { name }) => {
      const root = name?.split('.')[0];
      const owner = fields.find((entry) => valueKey(entry.field) === root);
      if (owner) markDirty(owner.section);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form, fields, markDirty]);

  const continueBlock = async (): Promise<boolean> => {
    cancel();
    if (!(await form.trigger())) return false;

    setIsPending(true);
    reporter.saving();
    try {
      const { current, normalized } = bodies();
      for (const section of sectionsOf(fields)) {
        const body = sectionBody(section, fields, current, normalized);
        const others = {
          ...mergeSections({ ...current, [section]: {} }),
          ...external,
        };
        const mode =
          isSectionComplete(section, country, body, others) ? 'complete' : (
            'draft'
          );
        await saveSection(client, requestId, section, mode, body);
      }
      reporter.saved();
      return true;
    } catch (error) {
      reporter.failed();
      const rejected = fieldErrorsOf(error);
      for (const { field, code } of rejected) {
        form.setError(field, { type: 'server', message: code });
      }
      if (rejected.length === 0) {
        toast.error({ heading: t('title'), description: t('description') });
      }
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { continueBlock, isPending };
};

export { useBlockSave, type UseBlockSaveOptions };
