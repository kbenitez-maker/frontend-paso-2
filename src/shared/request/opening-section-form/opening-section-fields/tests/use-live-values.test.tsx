import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { useLiveValues } from '../use-live-values';

type Values = Record<string, unknown>;

const useHarness = () => {
  const form = useForm<Values>({
    defaultValues: { legal_name: 'Empresa S.A.' },
  });
  return { form, values: useLiveValues(form) };
};

describe('useLiveValues', () => {
  it('keeps an untouched field on its default and a stable reference', () => {
    const { result, rerender } = renderHook(() => useHarness());

    expect(result.current.values['legal_name']).toBe('Empresa S.A.');
    const first = result.current.values;
    rerender();
    expect(result.current.values).toBe(first);
  });

  it('returns a new reference when a value changes', () => {
    const { result } = renderHook(() => useHarness());
    const first = result.current.values;

    act(() => {
      result.current.form.setValue('legal_name', 'Otra');
    });

    expect(result.current.values['legal_name']).toBe('Otra');
    expect(result.current.values).not.toBe(first);
  });
});
