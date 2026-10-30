import type { ControlProps } from '../lib';

import { useTranslations } from 'next-intl';

import {
  RadioGroup,
  RadioGroupItem,
} from '@lafise/onyx-ui/forms/control-group';

import { FieldLabel } from '../field-label';

const YES = 'yes';
const NO = 'no';

/**
 * Yes/No pair instead of a switch: an unanswered question must not read as
 * "No", because the contract's conditions tell both apart.
 */
const BooleanInput = ({
  label,
  value,
  onChange,
  onBlur,
  isRequired,
  isDisabled,
  isInvalid,
}: Readonly<ControlProps<boolean>>) => {
  const t = useTranslations('Form');
  let selected: string | null = null;
  if (value !== undefined) selected = value ? YES : NO;

  return (
    <RadioGroup
      value={selected}
      onChange={(key) => {
        onChange(key === YES);
      }}
      onBlur={onBlur}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      layout='grid'
    >
      <FieldLabel label={label} isRequired={isRequired} />
      <RadioGroup.List>
        {[
          { id: YES, text: t('yes') },
          { id: NO, text: t('no') },
        ].map((option) => (
          <RadioGroupItem key={option.id} value={option.id}>
            <RadioGroupItem.Content>
              <RadioGroupItem.Label>{option.text}</RadioGroupItem.Label>
            </RadioGroupItem.Content>
          </RadioGroupItem>
        ))}
      </RadioGroup.List>
    </RadioGroup>
  );
};

export { BooleanInput };
