import { describe, expect, it } from 'vitest';

import { flagUrlOf } from '@/lib/constants/countries';
import { render, screen } from '@/test/render';

import { CountryFlag } from '../country-flag';

describe('CountryFlag', () => {
  it('renders a decorative 24px vector flag by default', () => {
    render(<CountryFlag country='PA' />);

    const img = screen.getByRole('presentation');
    expect(img.getAttribute('src')).toBe(flagUrlOf('PA'));
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('width')).toBe('24');
    expect(img.getAttribute('height')).toBe('24');
  });

  it('supports a custom size for compact indicators', () => {
    render(<CountryFlag country='DO' size={16} />);

    const img = screen.getByRole('presentation');
    expect(img.getAttribute('src')).toBe(flagUrlOf('DO'));
    expect(img.getAttribute('width')).toBe('16');
    expect(img.getAttribute('height')).toBe('16');
  });
});
