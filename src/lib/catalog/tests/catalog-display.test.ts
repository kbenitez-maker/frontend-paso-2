import { describe, expect, it } from 'vitest';

import {
  normalizeCatalogDisplayName,
  presentCatalogItems,
} from '@/lib/catalog';

describe('normalizeCatalogDisplayName', () => {
  it('title-cases each word', () => {
    expect(normalizeCatalogDisplayName('SUCURSAL CHIQUIRI', 'es')).toBe(
      'Sucursal Chiquiri',
    );
  });

  it('trims and collapses whitespace', () => {
    expect(normalizeCatalogDisplayName('  FOO   BAR  ', 'en')).toBe('Foo Bar');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeCatalogDisplayName('', 'es')).toBe('');
    expect(normalizeCatalogDisplayName('   ', 'es')).toBe('');
  });

  it('preserves locale-specific casing', () => {
    expect(normalizeCatalogDisplayName('NIÑO PEQUEÑO', 'es')).toBe(
      'Niño Pequeño',
    );
  });

  it('leaves mixed-case API labels unchanged', () => {
    expect(normalizeCatalogDisplayName('Representante legal', 'es')).toBe(
      'Representante legal',
    );
    expect(
      normalizeCatalogDisplayName(
        'Nivel 1 · Inversiones Alfa S.A. · sin accionistas todavía',
        'es',
      ),
    ).toBe('Nivel 1 · Inversiones Alfa S.A. · sin accionistas todavía');
  });

  it('preserves short acronyms and dotted legal suffixes in ALL CAPS labels', () => {
    expect(normalizeCatalogDisplayName('INVERSIONES ALFA S.A.', 'es')).toBe(
      'Inversiones Alfa S.A.',
    );
    expect(normalizeCatalogDisplayName('TIPO RUC', 'es')).toBe('Tipo RUC');
    expect(normalizeCatalogDisplayName('CONTRIBUYENTE NRC', 'es')).toBe(
      'Contribuyente NRC',
    );
    expect(normalizeCatalogDisplayName('EMPRESA LTDA', 'es')).toBe(
      'Empresa LTDA',
    );
    expect(normalizeCatalogDisplayName("SEAN O'BRIEN", 'es')).toBe(
      "Sean O'BRIEN",
    );
  });
});

describe('presentCatalogItems', () => {
  it('normalizes names and keeps codes and flags', () => {
    expect(
      presentCatalogItems(
        [
          { code: 'chiquiri', name: 'SUCURSAL CHIQUIRI' },
          { code: 'xx', name: 'PAÍS X', prohibited: true },
        ],
        'es',
      ),
    ).toEqual([
      { code: 'chiquiri', name: 'Sucursal Chiquiri' },
      { code: 'xx', name: 'País X', prohibited: true },
    ]);
  });
});
