'use client';

import type { BlockCardProps } from '@/shared/step-form/block-card';

import { useTranslations } from 'next-intl';
import { useController, useFormContext } from 'react-hook-form';

import { Select } from '@lafise/onyx-ui/forms/select';

import { isRequired, sectionFields } from '@/contracts';
import { FieldLabel } from '@/shared/form/field-label';
import { FieldMessages } from '@/shared/form/field-messages';
import { useCatalog, useErrorText } from '@/shared/form/hooks';

import { approversOf } from './lib/approvers-of';
import { approvalsBlockTheme } from './themes';

const { approver } = approvalsBlockTheme();

/** The people a superuser is designated from (POC: legal representatives and signers registered). */
const SIGNATORIES = sectionFields('superusers').find(
  (field) => field.key === 'registered_signatory_id',
)?.catalog ?? { name: 'related-persons', source: 'request' };

/** Approver select fed by the superusers captured in the previous block, not by a fixed catalog. */
const ApproverField = ({
  field,
  country,
  bankId,
  labelOf,
  context,
}: Readonly<
  Pick<BlockCardProps, 'country' | 'bankId' | 'labelOf' | 'context'> & {
    field: BlockCardProps['fields'][number]['field'];
  }
>) => {
  const t = useTranslations('Bancanet');
  const tForm = useTranslations('Form');
  const errorText = useErrorText();
  const { control } = useFormContext();
  const { field: bound, fieldState } = useController({
    name: field.key,
    control,
  });
  const { options: signatories } = useCatalog({
    bankId,
    catalog: SIGNATORIES,
    parentValue: undefined,
  });
  const options = approversOf(context['superusers'], signatories);
  const required = isRequired(field.required, country);
  const value = typeof bound.value === 'string' ? bound.value : null;

  return (
    <div className={approver()}>
      <Select
        value={value}
        onChange={(key) => {
          bound.onChange(key === null ? undefined : String(key));
        }}
        onBlur={bound.onBlur}
        isDisabled={options.length === 0}
        isInvalid={fieldState.error !== undefined}
        isRequired={required}
        placeholder={
          options.length === 0 ?
            t('approvers.empty')
          : tForm('placeholder.select')
        }
      >
        <FieldLabel label={labelOf(field.key)} isRequired={required} />
        <Select.Trigger size='lg' />
        <Select.Popover>
          <Select.List>
            {options.map((option) => (
              <Select.Item
                key={option.code}
                id={option.code}
                textValue={option.name}
              >
                {option.name}
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popover>
      </Select>
      <FieldMessages
        hint={t('approvers.hint')}
        error={errorText(fieldState.error?.message)}
      />
    </div>
  );
};

export { ApproverField };
