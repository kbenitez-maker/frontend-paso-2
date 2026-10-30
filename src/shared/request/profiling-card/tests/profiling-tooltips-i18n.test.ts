import { describe, expect, it } from 'vitest';

import { es } from '@/test/render';
import { COUNTRY_CODES } from '@/types/domain';

describe('NewRequest.tooltips (profiling step)', () => {
  it('covers every CountryCode in es for identification', () => {
    for (const country of COUNTRY_CODES) {
      // eslint-disable-next-line security/detect-object-injection -- country from COUNTRY_CODES
      expect(es.NewRequest.tooltips.identification[country]).toMatch(/\S/);
    }
  });
});
