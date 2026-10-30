import type { BankId, CountryCode } from '@/types/domain';

import { useTranslations } from 'next-intl';

import { Text } from '@lafise/onyx-ui/typography/text';

import { CountryFlag } from '@/shared/request/country-flag';

import { countryBadgeTheme } from './themes';

const { root, countryName, bankCode } = countryBadgeTheme();

interface CountryBadgeProps {
  country: CountryCode;
  bankId?: BankId | undefined;
}

/** Pill showing the request jurisdiction (flag, country name and bank code). */
const CountryBadge = ({ country, bankId }: Readonly<CountryBadgeProps>) => {
  const t = useTranslations('Steps');

  return (
    <div className={root()}>
      <CountryFlag country={country} />
      <Text size='sm' className={countryName()}>
        {t(`rail.countries.${country}`)}
      </Text>
      {bankId === undefined ? null : (
        <>
          <Text size='sm' className={bankCode()} aria-hidden>
            ·
          </Text>
          <Text size='sm' className={bankCode()}>
            {bankId}
          </Text>
        </>
      )}
    </div>
  );
};

export { CountryBadge, type CountryBadgeProps };
