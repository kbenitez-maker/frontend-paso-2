'use client';

import { useMemo } from 'react';

import type { UseFormReturn } from 'react-hook-form';

import { useWatch } from 'react-hook-form';

type Values = Record<string, unknown>;

/**
 * Current form values, recomputed on every edit. `useWatch` leaves fields
 * nobody touched `undefined`; their default values fill them in. The result
 * keeps its reference until a value changes.
 */
const useLiveValues = (form: UseFormReturn<Values>): Values => {
  const watched = useWatch({ control: form.control });
  return useMemo(() => {
    const filled = Object.fromEntries(
      Object.entries(watched).filter((entry) => entry[1] !== undefined),
    );
    return { ...form.getValues(), ...filled };
  }, [form, watched]);
};

export { useLiveValues };
