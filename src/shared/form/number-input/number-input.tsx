import { useState } from 'react';

import type { ControlProps } from '../lib';

import { useTranslations } from 'next-intl';

import { Input } from '@lafise/onyx-ui/forms/input';
import { TextField } from '@lafise/onyx-ui/forms/text-field';

import { FieldLabel } from '../field-label';

interface NumberInputProps extends ControlProps<number> {
  /** Optional help text, already translated, shown next to the label. */
  tooltip?: string | undefined;
  integer: boolean;
  /** Overrides the generic "numbers only" placeholder. */
  placeholder?: string | undefined;
}

/** Keeps digits (and one dot for decimals): what cannot be typed cannot be saved. */
const sanitize = (text: string, integer: boolean): string => {
  if (integer) return text.replaceAll(/\D/g, '');
  const cleaned = text.replaceAll(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot < 0 ? cleaned : (
      cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replaceAll('.', '')
    );
};

const toNumber = (text: string): number | undefined =>
  text === '' || Number.isNaN(Number(text)) ? undefined : Number(text);

/**
 * Integer and decimal fields. It keeps the text apart from the number so a
 * half-typed "1." survives; the form only ever sees the number.
 */
const NumberInput = ({
  integer,
  label,
  value,
  onChange,
  onBlur,
  isRequired,
  isDisabled,
  isInvalid,
  icon,
  tooltip,
  placeholder,
}: Readonly<NumberInputProps>) => {
  const t = useTranslations('Form.placeholder');
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [seenValue, setSeenValue] = useState(value);

  // The form changed the value (reset, server data): follow it unless the text already says the same.
  if (value !== seenValue) {
    setSeenValue(value);
    if (toNumber(text) !== value)
      setText(value === undefined ? '' : String(value));
  }

  return (
    <TextField
      value={text}
      onChange={(entry) => {
        const next = sanitize(entry, integer);
        setText(next);
        onChange(toNumber(next));
      }}
      onBlur={onBlur}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
    >
      <FieldLabel label={label} isRequired={isRequired} tooltip={tooltip} />
      <Input
        size='lg'
        inputMode={integer ? 'numeric' : 'decimal'}
        placeholder={placeholder ?? t('number')}
        prefix={icon}
      />
    </TextField>
  );
};

export { NumberInput, type NumberInputProps };
