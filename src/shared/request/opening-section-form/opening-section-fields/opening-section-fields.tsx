'use client';

import { useMemo } from 'react';

import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type {
  OPENING_COMPANY_STEP,
  OPENING_ECONOMIC_ACTIVITY_STEP,
} from '@/lib/opening';
import type { OpeningCurrentSection } from '@/server/api';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';

import { FormProvider, useForm } from 'react-hook-form';

import {
  answerableOpeningFields,
  isOpeningFieldRequired,
  isOpeningFieldVisible,
  missingOpeningRequiredFields,
  requiredOpeningFields,
} from '@/lib/opening';
import { useRegisterOpeningLiveValues } from '@/shared/request/opening-live-values';
import { SectionCard } from '@/shared/request/section-card';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { OpeningCollection } from '../opening-collection';
import { OpeningFormField } from '../opening-form-field';
import { useOpeningSectionSave } from '../use-opening-section-save';
import { useLiveValues } from './use-live-values';

interface OpeningSectionFieldsProps {
  requestId: string;
  section: OpeningCurrentSection;
  /** Step from the route, the one the answer is saved under. */
  stepCode: typeof OPENING_COMPANY_STEP | typeof OPENING_ECONOMIC_ACTIVITY_STEP;
  /** Local preview bank, so this section's answer is not reused across countries. */
  previewBank?: string | undefined;
  /** Rail block that hosts the section. */
  block: BlockOf<StepSlug>;
  /** This section's answers in the saved step answer; they win over `section.values`. */
  savedValues: Record<string, unknown>;
  bankId: BankId | undefined;
  country: CountryCode | undefined;
  icons?: ReadonlyMap<string, ReactNode> | undefined;
}

/**
 * The form of one opening-request section: its visible fields in display
 * order, autosaved, with Continue held until every answerable required field
 * is filled.
 */
const OpeningSectionFields = ({
  requestId,
  section,
  stepCode,
  previewBank,
  block,
  savedValues,
  bankId,
  country,
  icons,
}: Readonly<OpeningSectionFieldsProps>) => {
  const form = useForm<Record<string, unknown>>({
    defaultValues: { ...section.values, ...savedValues },
    mode: 'onChange',
  });
  const values = useLiveValues(form);
  useRegisterOpeningLiveValues(section.section_code, values);
  const { continueSection, isPending } = useOpeningSectionSave({
    requestId,
    stepCode,
    previewBank,
    section,
    form,
    bankId,
    country,
  });
  const current = {
    fields: section.fields,
    values,
  };
  const missing = missingOpeningRequiredFields(current, { bankId, country });
  useRegisterStepGate({
    canContinue: missing.length === 0 && !isPending,
    isPending,
    onContinue: continueSection,
  });
  const visibleFields = useMemo(
    () =>
      answerableOpeningFields(section.fields)
        .filter((field) => isOpeningFieldVisible(field, values))
        .sort((left, right) => left.display_order - right.display_order),
    [section.fields, values],
  );

  return (
    <FormProvider {...form}>
      <SectionCard
        title={section.display_name}
        required={requiredOpeningFields(current).length > 0}
      >
        {visibleFields.map((field) =>
          field.field_type === 'collection' ?
            <OpeningCollection
              key={field.code}
              field={field}
              block={block}
              bankId={bankId}
              country={country}
              icons={icons}
            />
          : <OpeningFormField
              key={field.code}
              field={field}
              block={block}
              bankId={bankId}
              country={country}
              isRequired={isOpeningFieldRequired(field, values)}
              icon={icons?.get(field.code)}
            />,
        )}
      </SectionCard>
    </FormProvider>
  );
};

export { OpeningSectionFields, type OpeningSectionFieldsProps };
