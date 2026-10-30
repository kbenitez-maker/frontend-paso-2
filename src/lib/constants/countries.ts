import type { CountryCode } from '@/types/domain';

import { ASSETS } from './assets';

/**
 * Circular vector flag for a request country, served locally from
 * `public/assets/country/` behind the zone's `BASE_PATH`.
 */
const flagUrlOf = (country: CountryCode): string =>
  // eslint-disable-next-line security/detect-object-injection -- key typed by the CountryCode union
  ASSETS.countryFlags[country];

export { flagUrlOf };
