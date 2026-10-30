'use client';

import { useMemo } from 'react';

import type { ContractStep } from '@/contracts';
import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { BankId, CountryCode } from '@/types/domain';
import type { ComponentType, ReactNode } from 'react';
import type { BlockCardProps } from '../block-card';
import type { BlockRule } from '../block-validation';
import type { SectionValues, Values } from '../block-values';

import { useTranslations } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';

import { useRegisterStepGate } from '@/shared/request/step-gate';

import { BlockCard } from '../block-card';
import { blockFieldsOf, blockItems } from '../block-fields';
import { blockResolver } from '../block-validation';
import { contextOf, initialValues } from '../block-values';
import { useBlockSave } from './use-block-save';
import { useFieldLabels } from './use-field-labels';

interface StepBlockFormProps {
  step: ContractStep;
  requestId: string;
  bankId: BankId;
  country: CountryCode;
  block: BlockOf<StepSlug>;
  bySection: SectionValues;
  icons?: ReadonlyMap<string, ReactNode> | undefined;
  /** Replaces the default card; rendered inside the block's form provider. */
  Card?: ComponentType<BlockCardProps> | undefined;
  /** Values the conditions read that no section holds (see `StepFormProps.context`). */
  external?: Values | undefined;
  rule?: BlockRule | undefined;
}

/**
 * Form of one block of a registry-driven step. The form is created per block
 * (the parent keys it), starts from what is saved, validates with the
 * generated schema, saves drafts as the user types and tells the footer when
 * "Continue" may proceed.
 */
const StepBlockForm = ({
  step,
  requestId,
  bankId,
  country,
  block,
  bySection,
  icons,
  Card = BlockCard,
  external,
  rule,
}: Readonly<StepBlockFormProps>) => {
  const t = useTranslations('Steps');
  const labelOf = useFieldLabels(step);
  const fields = useMemo(
    () => blockFieldsOf(step, block, country),
    [step, block, country],
  );
  const items = useMemo(() => blockItems(fields), [fields]);
  const context = useMemo(
    () => ({ ...contextOf(bySection, fields), ...external }),
    [bySection, fields, external],
  );

  const form = useForm<Values>({
    defaultValues: initialValues(fields, bySection),
    resolver: blockResolver(fields, context, country, rule),
    mode: 'onChange',
  });
  const { continueBlock, isPending } = useBlockSave({
    requestId,
    country,
    fields,
    bySection,
    form,
    external,
  });

  useRegisterStepGate({
    canContinue: form.formState.isValid && !isPending,
    isPending,
    onContinue: continueBlock,
  });

  return (
    <FormProvider {...form}>
      <Card
        title={t(`blocks.${block}`)}
        items={items}
        fields={fields}
        context={context}
        country={country}
        bankId={bankId}
        labelOf={labelOf}
        icons={icons}
      />
    </FormProvider>
  );
};

export { StepBlockForm, type StepBlockFormProps };
