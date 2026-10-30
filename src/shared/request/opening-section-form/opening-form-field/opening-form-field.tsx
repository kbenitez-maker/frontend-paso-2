'use client';

import { memo } from 'react';

import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { OpeningSectionField } from '@/server/api';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';

import { useController } from 'react-hook-form';

import { toOpeningFieldDefinition } from '@/lib/opening';
import { FieldRenderer } from '@/shared/form/field-renderer';
import { useErrorText } from '@/shared/form/hooks/use-error-text';

interface OpeningFormFieldProps {
  field: OpeningSectionField;
  block: BlockOf<StepSlug>;
  bankId: BankId | undefined;
  country: CountryCode | undefined;
  /** Required now, for the current answers (`requiredWhen` included). */
  isRequired: boolean;
  icon?: ReactNode;
}

/**
 * One opening-request field bound to the section form. A field type or
 * catalog the portal does not map renders nothing. Memoized: the section
 * re-renders on every edit, and a sibling field's props do not.
 */
const OpeningFormFieldBase = ({
  field,
  block,
  bankId,
  country,
  isRequired,
  icon,
}: Readonly<OpeningFormFieldProps>) => {
  const definition = toOpeningFieldDefinition(field, block);
  const { field: bound, fieldState } = useController<Record<string, unknown>>({
    name: field.code,
  });
  const errorText = useErrorText();
  if (definition === undefined) return null;

  return (
    <FieldRenderer
      field={definition}
      label={field.display_name}
      value={bound.value}
      onChange={bound.onChange}
      onBlur={bound.onBlur}
      bankId={bankId}
      country={country}
      isRequired={isRequired}
      error={errorText(fieldState.error?.message)}
      hint={field.help_text}
      placeholder={field.placeholder}
      icon={icon}
    />
  );
};

const OpeningFormField = memo(OpeningFormFieldBase);

export { OpeningFormField, type OpeningFormFieldProps };
