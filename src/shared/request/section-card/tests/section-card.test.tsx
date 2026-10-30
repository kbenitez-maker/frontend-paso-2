import { describe, expect, it } from 'vitest';

import { Text } from '@lafise/onyx-ui/typography/text';

import { es, render, screen } from '@/test/render';

import { SectionCard } from '..';

describe('SectionCard', () => {
  it('titles the block with a level-2 heading', () => {
    render(<SectionCard title='Datos de contacto' />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Datos de contacto' }),
    ).toBeDefined();
  });

  it('marks the block required by default', () => {
    render(<SectionCard title='Datos de contacto' />);

    expect(screen.getByText(es.Steps.required)).toBeDefined();
    expect(screen.queryByText(es.Steps.optional)).toBeNull();
  });

  it('marks an optional block', () => {
    render(<SectionCard title='Sucursales' required={false} />);

    expect(screen.getByText(es.Steps.optional)).toBeDefined();
    expect(screen.queryByText(es.Steps.required)).toBeNull();
  });

  it('renders the fields of the block below the header', () => {
    render(
      <SectionCard title='Sucursales'>
        <Text>Sucursal principal</Text>
      </SectionCard>,
    );

    expect(screen.getByText('Sucursal principal')).toBeDefined();
  });
});
