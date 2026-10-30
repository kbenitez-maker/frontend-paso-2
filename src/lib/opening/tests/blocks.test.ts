import { describe, expect, it } from 'vitest';

import {
  openingBlockOf,
  openingCompanyBlocks,
  openingEconomicActivityBlocks,
  openingSectionCodeOf,
} from '@/lib/opening';

describe('openingBlockOf', () => {
  it('maps API section codes onto company rail blocks', () => {
    expect(openingBlockOf('contact')).toBe('contact');
    expect(openingBlockOf('management-company')).toBe('administering-company');
  });

  it('has no block for a section code the registry does not list', () => {
    expect(openingBlockOf('unknown-section')).toBeUndefined();
    expect(openingBlockOf('toString')).toBeUndefined();
    expect(openingBlockOf('constructor')).toBeUndefined();
  });
});

describe('openingSectionCodeOf', () => {
  it('maps a rail block back onto the opening-request section code', () => {
    expect(openingSectionCodeOf('contact')).toBe('contact');
    expect(openingSectionCodeOf('administering-company')).toBe(
      'management-company',
    );
  });
});

describe('openingCompanyBlocks', () => {
  it('orders the blocks by display order and skips unknown sections', () => {
    const sections = [
      { code: 'contact', display_name: 'Contacto', display_order: 2 },
      { code: 'not-a-block', display_name: 'Otra', display_order: 3 },
      {
        code: 'identification',
        display_name: 'Identificación',
        display_order: 1,
      },
    ];

    expect(openingCompanyBlocks(sections)).toEqual([
      'identification',
      'contact',
    ]);
  });
});

describe('openingEconomicActivityBlocks', () => {
  it('orders the blocks by display order and skips sections the step does not list', () => {
    const sections = [
      { code: 'tax-id', display_name: 'Información fiscal', display_order: 2 },
      { code: 'licenses', display_name: 'Licencias', display_order: 3 },
      { code: 'activity', display_name: 'Giro y sector', display_order: 1 },
    ];

    expect(openingEconomicActivityBlocks(sections)).toEqual([
      'activity',
      'tax-id',
    ]);
  });
});
