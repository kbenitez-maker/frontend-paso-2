'use client';

import { useMemo, useState } from 'react';

import type { ReactNode } from 'react';
import type { AutosaveReporter } from './context';

import { INITIAL, ReporterContext, StateContext } from './context';

interface AutosaveProviderProps {
  children: ReactNode;
}

/** Holds the save status for the header indicator; scoped to the request layout. */
const AutosaveProvider = ({ children }: Readonly<AutosaveProviderProps>) => {
  const [state, setState] = useState(INITIAL);
  const reporter = useMemo<AutosaveReporter>(
    () => ({
      saving: () => {
        setState((current) => ({ ...current, status: 'saving' }));
      },
      saved: () => {
        setState({ status: 'saved', savedAt: new Date() });
      },
      failed: () => {
        setState((current) => ({ ...current, status: 'error' }));
      },
    }),
    [],
  );

  return (
    <ReporterContext value={reporter}>
      <StateContext value={state}>{children}</StateContext>
    </ReporterContext>
  );
};

export { AutosaveProvider, type AutosaveProviderProps };
