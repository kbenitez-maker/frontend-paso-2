'use client';

import type { ProfileValues } from './lib/profile-schema';

import { useTranslations } from 'next-intl';
import { useController, useFormContext } from 'react-hook-form';

import { Divider } from '@lafise/onyx-ui/layout/divider';
import { Text } from '@lafise/onyx-ui/typography/text';

import { CatalogSelect } from '@/shared/form/catalog-select';
import { FieldMessages } from '@/shared/form/field-messages';
import { useErrorText } from '@/shared/form/hooks';
import { NumberInput } from '@/shared/form/number-input';
import { TextInput } from '@/shared/form/text-input';

import { useProfilingCard } from './context';
import { profilingCardTheme } from './themes';
import { useAnnualSalesConversion } from './use-annual-sales-conversion';
import { useProfilingTooltip } from './use-profiling-tooltip';

const { field } = profilingCardTheme();

/**
 * Second moment: the base data of a company that is new to the bank. Every
 * field is required, so none shows the "(Optional)" marker.
 */
const BaseDataFields = () => {
  const { bankId, onEntityTypeChange } = useProfilingCard();
  const t = useTranslations('NewRequest.baseData');
  const legalNameTooltip = useProfilingTooltip('legalName');
  const annualSalesTooltip = useProfilingTooltip('annualSales');
  const errorText = useErrorText();
  const { control } = useFormContext<ProfileValues>();
  const { field: legalName, fieldState: legalNameState } = useController({
    name: 'legal_name',
    control,
  });
  const { field: entityType, fieldState: entityTypeState } = useController({
    name: 'legal_entity_type_id',
    control,
  });
  const { field: sales, fieldState: salesState } = useController({
    name: 'annual_sales_usd',
    control,
  });
  const equivalent = useAnnualSalesConversion(bankId, sales.value);
  const { field: branch, fieldState: branchState } = useController({
    name: 'branch_id',
    control,
  });

  return (
    <>
      <Divider />

      <div className={field()}>
        <TextInput
          kind='string'
          label={t('legalName.label')}
          tooltip={legalNameTooltip}
          placeholder={t('legalName.placeholder')}
          value={legalName.value}
          onChange={(next) => {
            legalName.onChange(next ?? '');
          }}
          onBlur={legalName.onBlur}
          isRequired
          isDisabled={false}
          isInvalid={legalNameState.error !== undefined}
        />
        <FieldMessages error={errorText(legalNameState.error?.message)} />
      </div>

      <div className={field()}>
        <CatalogSelect
          bankId={bankId}
          catalog={{ name: 'legal-entity-types', source: 'api' }}
          label={t('legalEntityType.label')}
          value={entityType.value}
          onChange={(code) => {
            if (onEntityTypeChange === undefined || code === undefined) {
              entityType.onChange(code);
            } else if (code !== entityType.value) {
              onEntityTypeChange(code);
            }
          }}
          onBlur={entityType.onBlur}
          isRequired
          isDisabled={false}
          isInvalid={entityTypeState.error !== undefined}
        />
        <FieldMessages error={errorText(entityTypeState.error?.message)} />
      </div>

      <div className={field()}>
        <NumberInput
          integer={false}
          label={t('annualSales.label')}
          tooltip={annualSalesTooltip}
          icon={t('annualSales.prefix')}
          placeholder={t('annualSales.placeholder')}
          value={sales.value}
          onChange={sales.onChange}
          onBlur={sales.onBlur}
          isRequired
          isDisabled={false}
          isInvalid={salesState.error !== undefined}
        />
        <FieldMessages
          hint={t('annualSales.hint')}
          error={errorText(salesState.error?.message)}
        />
        {equivalent === undefined || salesState.error !== undefined ? null : (
          <Text size='sm' aria-live='polite'>
            {t('annualSales.equivalent', { amount: equivalent })}
          </Text>
        )}
      </div>

      <div className={field()}>
        <CatalogSelect
          bankId={bankId}
          catalog={{ name: 'branches', source: 'api' }}
          label={t('branch.label')}
          value={branch.value}
          onChange={branch.onChange}
          onBlur={branch.onBlur}
          isRequired
          isDisabled={false}
          isInvalid={branchState.error !== undefined}
        />
        <FieldMessages error={errorText(branchState.error?.message)} />
      </div>
    </>
  );
};

export { BaseDataFields };
