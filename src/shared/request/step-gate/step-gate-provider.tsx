'use client';

import { useMemo, useRef, useState } from 'react';

import type { ReactNode } from 'react';
import type { ContinueHandler } from './context';

import { CLOSED, ControlsContext, StateContext } from './context';

interface StepGateProviderProps {
  children: ReactNode;
}

/**
 * Lets a step (rendered by the page) tell the footer (rendered by the
 * layout) when "Continue" is allowed and what it must save first.
 */
const StepGateProvider = ({ children }: Readonly<StepGateProviderProps>) => {
  const [state, setState] = useState(CLOSED);
  const handlerRef = useRef<ContinueHandler | null>(null);
  const controls = useMemo(() => ({ setState, handlerRef }), []);

  return (
    <ControlsContext value={controls}>
      <StateContext value={state}>{children}</StateContext>
    </ControlsContext>
  );
};

export { StepGateProvider, type StepGateProviderProps };
