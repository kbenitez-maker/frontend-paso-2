import { describe, expect, it } from 'vitest';

import { flagUrlOf } from '@/lib/constants/countries';
import { es, render, screen } from '@/test/render';

import { CountryBadge } from '../country-badge';

describe('CountryBadge', () => {
  it('shows the country flag, translated country name and bank code', () => {
    render(<CountryBadge country='NI' bankId='BLNI' />);

    expect(screen.getByText(es.Steps.rail.countries.NI)).toBeDefined();
    expect(screen.getByText('BLNI')).toBeDefined();
    const flag = screen.getByRole('presentation');
    expect(flag.getAttribute('src')).toBe(flagUrlOf('NI'));
    expect(flag.getAttribute('alt')).toBe('');
  });

  it('omits the bank separator when no bankId is given', () => {
    render(<CountryBadge country='DO' />);

    expect(screen.getByText(es.Steps.rail.countries.DO)).toBeDefined();
    expect(screen.queryByText('BLNI')).toBeNull();
    expect(screen.queryByText('·')).toBeNull();
  });
});
