import Image from 'next/image';

import type { CountryCode } from '@/types/domain';

import { flagUrlOf } from '@/lib/constants/countries';

import { countryFlagTheme } from './themes';

interface CountryFlagProps {
  country: CountryCode;
  /** Side length in pixels. Defaults to 24 (table and badge); 16 for compact avatar indicators. */
  size?: 16 | 24 | undefined;
}

/**
 * Circular vector flag of a request country. Decorative (`alt=''`) because it
 * always accompanies the translated country name.
 */
const CountryFlag = ({ country, size = 24 }: Readonly<CountryFlagProps>) => (
  <Image
    src={flagUrlOf(country)}
    alt=''
    width={size}
    height={size}
    unoptimized
    className={countryFlagTheme()}
  />
);

export { CountryFlag, type CountryFlagProps };
