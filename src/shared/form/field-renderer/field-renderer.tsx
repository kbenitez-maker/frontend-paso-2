import type { FieldDefinition } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';
import type { ControlProps } from '../lib';

import { BooleanInput } from '../boolean-input';
import { CatalogSelect } from '../catalog-select';
import { DateInput } from '../date-input';
import { FieldMessages } from '../field-messages';
import { asBoolean, asNumber, asPhone, asString, asStrings } from '../lib';
import { MultiCatalogInput } from '../multi-catalog-input';
import { NumberInput } from '../number-input';
import { PhoneInput } from '../phone-input';
import { TextInput } from '../text-input';
import { fieldRendererTheme } from './themes';

interface FieldRendererProps {
  field: FieldDefinition;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  /** Bank whose catalogs this field reads. Without it the field stays on screen as unavailable. */
  bankId?: BankId | undefined;
  /** Request country (default dial code of phone fields). */
  country?: CountryCode | undefined;
  isRequired: boolean;
  isDisabled?: boolean;
  /** Already translated. */
  error?: string | undefined;
  hint?: string | undefined;
  /** Overrides the generic placeholder of text fields. */
  placeholder?: string | undefined;
  icon?: ReactNode;
  /** Value of the field this field's catalog depends on. */
  parentValue?: string | undefined;
  /** Country a `country_from` catalog is read for. */
  catalogCountry?: CountryCode | undefined;
}

/** Paragraphs and yes/no questions take the whole row; the rest share it two by two. */
const isFullWidth = (field: FieldDefinition): boolean =>
  field.full_width === true ||
  field.type === 'boolean' ||
  field.type === 'multi_catalog' ||
  field.multiline === true;

/**
 * Maps a registry field to the Onyx control of its `type`, with hint and
 * error underneath. It knows nothing about the form library: value in, change
 * out.
 */
const FieldRenderer = ({
  field,
  label,
  value,
  onChange,
  onBlur,
  bankId,
  country,
  isRequired,
  isDisabled = false,
  error,
  hint,
  placeholder,
  icon,
  parentValue,
  catalogCountry,
}: Readonly<FieldRendererProps>) => {
  const common = {
    label,
    onBlur,
    isRequired,
    isDisabled,
    isInvalid: error !== undefined,
    icon,
  } satisfies Omit<ControlProps<never>, 'value' | 'onChange'>;

  const control = (() => {
    switch (field.type) {
      case 'string':
      case 'email':
      case 'url':
        return (
          <TextInput
            {...common}
            kind={field.type}
            value={asString(value)}
            onChange={onChange}
            maxLength={field.max_length}
            multiline={field.multiline}
            placeholder={placeholder}
          />
        );
      case 'phone':
        return country === undefined ? null : (
            <PhoneInput
              {...common}
              country={country}
              value={asPhone(value)}
              onChange={onChange}
            />
          );
      case 'integer':
      case 'decimal':
        return (
          <NumberInput
            {...common}
            integer={field.type === 'integer'}
            value={asNumber(value)}
            onChange={onChange}
          />
        );
      case 'date':
        return (
          <DateInput {...common} value={asString(value)} onChange={onChange} />
        );
      case 'boolean':
        return (
          <BooleanInput
            {...common}
            value={asBoolean(value)}
            onChange={onChange}
          />
        );
      case 'catalog':
        return field.catalog === undefined ?
            null
          : <CatalogSelect
              {...common}
              bankId={bankId}
              catalog={field.catalog}
              parentValue={parentValue}
              catalogCountry={catalogCountry}
              value={asString(value)}
              onChange={onChange}
            />;
      case 'multi_catalog':
        return field.catalog === undefined ?
            null
          : <MultiCatalogInput
              {...common}
              bankId={bankId}
              catalog={field.catalog}
              value={asStrings(value)}
              onChange={onChange}
            />;
      default:
        return field.type satisfies never;
    }
  })();

  return (
    <div className={fieldRendererTheme({ fullWidth: isFullWidth(field) })}>
      {control}
      <FieldMessages hint={hint} error={error} />
    </div>
  );
};

export { FieldRenderer, isFullWidth, type FieldRendererProps };
