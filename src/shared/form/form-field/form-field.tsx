'use client';

import { useEffect } from 'react';

import type { FieldDefinition, Rule } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';
import type { FormValues } from '../lib';

import { useController, useFormContext, useWatch } from 'react-hook-form';

import { isRequired } from '@/contracts';
import { catalogCountryOf, catalogParentOf } from '@/contracts/catalogs';

import { FieldRenderer } from '../field-renderer';
import { useCatalog, useErrorText } from '../hooks';
import { asString } from '../lib';
import { useFieldHint } from './use-field-hint';

/** Fields one cross-field rule compares its field with. */
const referencesOfRule = (rule: Rule): readonly string[] => {
  if ('gte_field' in rule) return [rule.gte_field];
  if ('lte_field' in rule) return [rule.lte_field];
  if ('sum_lte' in rule) return [...rule.sum_lte.sum, ...rule.sum_lte.limit];
  if ('any_true' in rule) return rule.any_true;
  return [];
};

/** Fields a cross-field rule of `field` compares it with (itself left out). */
const ruleReferencesOf = (field: FieldDefinition): string[] =>
  (field.validation ?? [])
    .flatMap((rule: Rule) => referencesOfRule(rule))
    .filter((key) => key !== field.key);

interface FormFieldProps {
  field: FieldDefinition;
  /** Form path: the field key, or `<collection>.<index>.<key>` inside a collection. */
  name: string;
  country: CountryCode;
  bankId: BankId;
  /** Label of a registry field by key; fields with a country `variant` have one label per variant. */
  labelOf: (key: string, variant?: string) => string;
  icon?: ReactNode;
  /** Form paths of fields filtered by this one; they are cleared when this one changes. */
  dependents?: readonly string[];
}

/** A registry field bound to the surrounding react-hook-form context. */
const FormField = ({
  field,
  name,
  country,
  bankId,
  labelOf,
  icon,
  dependents = [],
}: Readonly<FormFieldProps>) => {
  const { control, setValue, trigger } = useFormContext<FormValues>();
  const { field: bound, fieldState } = useController({ name, control });
  // A dependent catalog watches the sibling it is filtered by (in this country).
  const parent = catalogParentOf(field.catalog, country);
  // Siblings are named like this field, inside a collection item too.
  const prefix = name.slice(0, name.length - field.key.length);
  const parentValue = useWatch({
    control,
    name: parent === undefined ? name : `${prefix}${parent}`,
  });
  const countryFrom = field.catalog?.country_from;
  const chosenCountry = useWatch({
    control,
    name: countryFrom === undefined ? name : `${prefix}${countryFrom}`,
  });
  const catalogCountry = catalogCountryOf(
    field.catalog,
    countryFrom === undefined ? {} : { [countryFrom]: chosenCountry },
    country,
  );
  const errorText = useErrorText();
  const hint = useFieldHint(field, labelOf);
  // A cross-field rule is checked again when a field it compares with changes
  // (siblings of the same item; fields outside the form read as undefined).
  const compared = JSON.stringify(
    useWatch({
      control,
      name: ruleReferencesOf(field).map((key) => `${prefix}${key}`),
    }),
  );
  const answered = bound.value !== undefined && bound.value !== '';
  useEffect(() => {
    if (answered) void trigger(name);
  }, [compared, answered, name, trigger]);

  // `hide_when_empty`: no rows under the chosen parent hides the field (and the
  // schema stops requiring it, so the form is validated again).
  const canHide =
    field.catalog?.hide_when_empty === true && parent !== undefined;
  const { options, isLoaded } = useCatalog({
    bankId,
    catalog:
      canHide && field.catalog ?
        field.catalog
      : { name: '', source: 'unknown' },
    parentValue: canHide ? asString(parentValue) : undefined,
    country: catalogCountry,
  });
  const isHidden = canHide && isLoaded && options.length === 0;
  // The catalog read is the event: validate again once it hides the field.
  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- no handler fires when a query resolves
    if (isHidden) void trigger(name);
  }, [isHidden, name, trigger]);
  if (isHidden) return null;

  // eslint-disable-next-line security/detect-object-injection -- `country` is a `CountryCode`
  const variant = field.variant?.[country];

  return (
    <FieldRenderer
      field={field}
      label={labelOf(field.key, variant)}
      value={bound.value}
      onChange={(next) => {
        bound.onChange(next);
        for (const dependent of dependents) {
          setValue(`${prefix}${dependent}`, undefined, { shouldDirty: true });
        }
      }}
      onBlur={bound.onBlur}
      bankId={bankId}
      country={country}
      isRequired={isRequired(field.required, country)}
      isDisabled={field.read_only === true}
      error={errorText(fieldState.error?.message)}
      hint={hint}
      icon={icon}
      parentValue={parent === undefined ? undefined : asString(parentValue)}
      catalogCountry={catalogCountry}
    />
  );
};

export { FormField, type FormFieldProps };
