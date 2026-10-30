import type { PhoneValue } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type { ControlProps } from '../lib';

import { useLocale, useTranslations } from 'next-intl';

import { PhoneNumberField } from '@lafise/onyx-ui/forms/phone-number-field';

import { SupportedLocales } from '@/types/i18n';

import { FieldLabel } from '../field-label';

/** Onyx keys its bundled dial-code list by ISO alpha-3. */
const ALPHA3: Readonly<Record<CountryCode, string>> = {
  NI: 'NIC',
  PA: 'PAN',
  CR: 'CRI',
  HN: 'HND',
  SV: 'SLV',
  DO: 'DOM',
};

interface PhoneInputProps extends ControlProps<PhoneValue> {
  /** Request country: its dial code is the default one. */
  country: CountryCode;
}

/** Dial-code selector plus national number; an empty number clears the answer. */
const PhoneInput = ({
  label,
  value,
  onChange,
  onBlur,
  isRequired,
  isDisabled,
  isInvalid,
  country,
}: Readonly<PhoneInputProps>) => {
  const t = useTranslations('Form.placeholder');
  const locale = useLocale() === SupportedLocales.En ? 'en' : 'es';

  return (
    <PhoneNumberField
      {...(value === undefined ?
        {}
      : { value: { numericCode: value.dial_code, phoneNumber: value.number } })}
      onChange={({ numericCode, phoneNumber }) => {
        onChange(
          phoneNumber === '' ? undefined : (
            { dial_code: numericCode, number: phoneNumber }
          ),
        );
      }}
      onBlur={onBlur}
      // eslint-disable-next-line security/detect-object-injection -- `country` is a `CountryCode`
      defaultCountry={ALPHA3[country]}
      locale={locale}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
    >
      <FieldLabel label={label} isRequired={isRequired} />
      <PhoneNumberField.Input size='lg' placeholder={t('number')} />
    </PhoneNumberField>
  );
};

export { PhoneInput };
