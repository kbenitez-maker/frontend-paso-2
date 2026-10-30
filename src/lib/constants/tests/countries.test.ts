import { describe, expect, it } from 'vitest';

import { flagUrlOf } from '../countries';
import { BASE_PATH } from '../layout';

describe('flagUrlOf', () => {
  it.each([
    ['NI', `${BASE_PATH}/assets/country/ni.svg`],
    ['PA', `${BASE_PATH}/assets/country/pa.svg`],
    ['CR', `${BASE_PATH}/assets/country/cr.svg`],
    ['HN', `${BASE_PATH}/assets/country/hn.svg`],
    ['SV', `${BASE_PATH}/assets/country/sv.svg`],
    ['DO', `${BASE_PATH}/assets/country/rd.svg`],
  ] as const)(
    'resolves %s to the local public country SVG behind BASE_PATH',
    (country, expected) => {
      expect(flagUrlOf(country)).toBe(expected);
    },
  );
});
