import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fieldOf, withQueries } from '@/test/form';
import { es, render, screen } from '@/test/render';

import { FieldRenderer } from '../field-renderer';

vi.mock('@/server/api', () => ({
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalogs', bankId, name],
    queryFn: () =>
      Promise.resolve({
        results: [{ code: 'NI', name: 'Nicaragua' }],
        count: 1,
      }),
  }),
}));

const base = {
  label: 'Sample label',
  value: undefined,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  bankId: 'BLNI',
  country: 'NI',
  isRequired: true,
} as const;

describe('FieldRenderer', () => {
  it.each(['string', 'email', 'url'] as const)(
    'renders %s as a text box and reports typed text',
    (type) => {
      const onChange = vi.fn();
      render(
        <FieldRenderer {...base} onChange={onChange} field={fieldOf(type)} />,
        { wrapper: withQueries },
      );

      const input = screen.getByRole('textbox', { name: /Sample label/ });
      fireEvent.change(input, { target: { value: 'hello' } });

      expect(onChange).toHaveBeenCalledWith('hello');
    },
  );

  it('turns an emptied text into "no answer"', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        {...base}
        value='abc'
        onChange={onChange}
        field={fieldOf('string')}
      />,
      { wrapper: withQueries },
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('renders a multiline text as a text area', () => {
    render(
      <FieldRenderer
        {...base}
        field={fieldOf('string', { multiline: true })}
      />,
      { wrapper: withQueries },
    );

    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('renders a phone with the request dial code and reports both parts', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer {...base} onChange={onChange} field={fieldOf('phone')} />,
      { wrapper: withQueries },
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '8888-7777' },
    });

    expect(onChange).toHaveBeenCalledWith({
      dial_code: '+505',
      number: '88887777',
    });
  });

  it('renders integers as numbers and drops what is not a digit', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        {...base}
        onChange={onChange}
        field={fieldOf('integer')}
      />,
      { wrapper: withQueries },
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '12ab' },
    });

    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('keeps a decimal point while typing', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        {...base}
        onChange={onChange}
        field={fieldOf('decimal')}
      />,
      { wrapper: withQueries },
    );
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '1.' } });

    expect(onChange).toHaveBeenCalledWith(1);
    expect(input).toHaveProperty('value', '1.');
  });

  it('renders a date field with its picker trigger', () => {
    render(<FieldRenderer {...base} field={fieldOf('date')} />, {
      wrapper: withQueries,
    });

    expect(screen.getByText(es.Form.placeholder.date)).toBeDefined();
  });

  it('renders a boolean as Yes/No and reports the choice', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        {...base}
        onChange={onChange}
        field={fieldOf('boolean')}
      />,
      { wrapper: withQueries },
    );

    fireEvent.click(screen.getByRole('radio', { name: es.Form.no }));

    expect(screen.getByRole('radio', { name: es.Form.yes })).toBeDefined();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders a catalog as a select fed by the bank catalog', async () => {
    render(
      <FieldRenderer
        {...base}
        field={fieldOf('catalog', {
          catalog: { name: 'countries', source: 'unknown' },
        })}
      />,
      { wrapper: withQueries },
    );

    expect(await screen.findByText(es.Form.placeholder.select)).toBeDefined();
  });

  it('keeps a catalog on screen when the bank is unknown', async () => {
    render(
      <FieldRenderer
        {...base}
        bankId={undefined}
        field={fieldOf('catalog', {
          catalog: { name: 'countries', source: 'unknown' },
        })}
      />,
      { wrapper: withQueries },
    );

    expect(await screen.findByText(es.Form.catalog.unavailable)).toBeDefined();
  });

  it('renders a multi catalog as a list of options', async () => {
    render(
      <FieldRenderer
        {...base}
        field={fieldOf('multi_catalog', {
          catalog: { name: 'countries', source: 'unknown' },
        })}
      />,
      { wrapper: withQueries },
    );

    expect(await screen.findByText('Nicaragua')).toBeDefined();
  });

  it('shows the error instead of the hint, and marks optional fields', () => {
    render(
      <FieldRenderer
        {...base}
        isRequired={false}
        hint='A hint'
        error='Broken'
        field={fieldOf('string')}
      />,
      { wrapper: withQueries },
    );

    expect(screen.getByRole('alert').textContent).toBe('Broken');
    expect(screen.queryByText('A hint')).toBeNull();
    expect(screen.getByText(es.Form.optional)).toBeDefined();
  });
});
