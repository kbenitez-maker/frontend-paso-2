import type { CountryCode } from '@/types/domain';

import { BASE_PATH } from './layout';

/** Circular vector flags under `public/assets/country/`; Dominican Republic (`DO`) is named `rd.svg`. */
const COUNTRY_FLAGS: Readonly<Record<CountryCode, string>> = {
  NI: `${BASE_PATH}/assets/country/ni.svg`,
  PA: `${BASE_PATH}/assets/country/pa.svg`,
  CR: `${BASE_PATH}/assets/country/cr.svg`,
  HN: `${BASE_PATH}/assets/country/hn.svg`,
  SV: `${BASE_PATH}/assets/country/sv.svg`,
  DO: `${BASE_PATH}/assets/country/rd.svg`,
};

/** Static files under `public/`; served behind the zone's basePath. */
const ASSETS = {
  bankLogo: `${BASE_PATH}/assets/images/lafise-banco.svg`,
  laptopOutOfService: `${BASE_PATH}/illustrations/laptop-out-of-service.png`,
  countryFlags: COUNTRY_FLAGS,
} as const;

export { ASSETS };
