'use client';

import { useMemo } from 'react';

import type { ProfileValues } from './lib/profile-schema';

import { useTranslations } from 'next-intl';
import { useFormContext, useWatch } from 'react-hook-form';

import { IdCard, Refresh } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { CategorizedInputField } from '@lafise/onyx-ui/forms/categorized-input-field';
import { SelectItem } from '@lafise/onyx-ui/forms/select';
import { Text } from '@lafise/onyx-ui/typography/text';

import { FieldLabel } from '@/shared/form/field-label';
import { FieldMessages } from '@/shared/form/field-messages';
import { useCatalog, useErrorText } from '@/shared/form/hooks';

import { useProfilingCard } from './context';
import { profilingCardTheme } from './themes';
import { useProfilingTooltip } from './use-profiling-tooltip';

const { unavailable, unavailableText } = profilingCardTheme();

/**
 * Type and number as one control: the number means nothing until the document
 * is known, and Onyx keeps it disabled until a type is chosen and clears it
 * when the type changes. Types are the legal-person rows of the bank's catalog.
 */
const IdentificationField = () => {
  const { bankId, moment } = useProfilingCard();
  // Once the company is verified its identification cannot change.
  const isLocked = moment === 'base-data';
  const t = useTranslations('NewRequest.identification');
  const identificationTooltip = useProfilingTooltip('identification');
  const tForm = useTranslations('Form.catalog');
  const errorText = useErrorText();
  const { control, setValue, formState } = useFormContext<ProfileValues>();
  const typeError = formState.errors.identification_type_id?.message;
  const [typeId, number] = useWatch({
    control,
    name: ['identification_type_id', 'identification_number'],
  });
  const { options, isUnavailable, retry } = useCatalog({
    bankId,
    catalog: { name: 'identification-types', source: 'api' },
    parentValue: undefined,
    personType: 'legal',
  });
  const items = useMemo(
    () => options.map((option) => ({ id: option.code, label: option.name })),
    [options],
  );

  return (
    <>
      <CategorizedInputField
        items={items}
        size='lg'
        isDisabled={isLocked || isUnavailable}
        isInvalid={typeError !== undefined}
        value={{
          select: typeId === '' ? null : typeId,
          input: number,
        }}
        onChange={({ select, input }) => {
          setValue('identification_type_id', select ?? '');
          setValue('identification_number', input);
        }}
      >
        <FieldLabel
          label={t('label')}
          isRequired
          tooltip={identificationTooltip}
        />

        <CategorizedInputField.Group>
          <CategorizedInputField.Select
            placeholder={t('typePlaceholder')}
            aria-label={t('typeLabel')}
          >
            {(option: { id: string; label: string }) => (
              <SelectItem id={option.id} textValue={option.label}>
                <SelectItem.Label>{option.label}</SelectItem.Label>
              </SelectItem>
            )}
          </CategorizedInputField.Select>

          <CategorizedInputField.Input
            placeholder={t('numberPlaceholder')}
            prefix={<IdCard size='sm' />}
          />
        </CategorizedInputField.Group>
      </CategorizedInputField>
      <FieldMessages error={errorText(typeError)} />

      {isUnavailable ?
        <div className={unavailable()}>
          <Text size='sm' role='alert' className={unavailableText()}>
            {tForm('unavailable')}
          </Text>
          <Button variant='outline' size='sm' onPress={retry}>
            <Refresh size='sm' />
            {tForm('retry')}
          </Button>
        </div>
      : null}
    </>
  );
};

export { IdentificationField };
