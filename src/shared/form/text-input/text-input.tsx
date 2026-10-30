import type { ControlProps } from '../lib';

import { useTranslations } from 'next-intl';

import { Input } from '@lafise/onyx-ui/forms/input';
import { TextArea } from '@lafise/onyx-ui/forms/text-area';
import { TextField } from '@lafise/onyx-ui/forms/text-field';

import { FieldLabel } from '../field-label';

type TextKind = 'string' | 'email' | 'url';

interface TextInputProps extends ControlProps<string> {
  /** Optional help text, already translated, shown next to the label. */
  tooltip?: string | undefined;
  kind: TextKind;
  maxLength?: number | undefined;
  /** Paragraph answer: a text area (with a counter when there is a `maxLength`). */
  multiline?: boolean | undefined;
  /** Overrides the generic placeholder of the kind. */
  placeholder?: string | undefined;
}

/** Text, email and url fields. Paragraph texts get a text area. */
const TextInput = ({
  kind,
  label,
  value,
  onChange,
  onBlur,
  isRequired,
  isDisabled,
  isInvalid,
  icon,
  tooltip,
  maxLength,
  multiline = false,
  placeholder: customPlaceholder,
}: Readonly<TextInputProps>) => {
  const t = useTranslations('Form.placeholder');
  const defaultKey = multiline ? 'textLong' : 'text';
  const placeholder =
    customPlaceholder ?? t(kind === 'string' ? defaultKey : kind);

  return (
    <TextField
      value={value ?? ''}
      onChange={(text) => {
        onChange(text === '' ? undefined : text);
      }}
      onBlur={onBlur}
      type={kind === 'string' ? 'text' : kind}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...(maxLength === undefined ? {} : { maxLength })}
    >
      <FieldLabel label={label} isRequired={isRequired} tooltip={tooltip} />
      {multiline ?
        <>
          <TextArea placeholder={placeholder} rows={3} />
          {maxLength === undefined ? null : <TextField.Counter />}
        </>
      : <Input size='lg' placeholder={placeholder} prefix={icon} />}
    </TextField>
  );
};

export { TextInput, type TextInputProps, type TextKind };
