'use client';

import { use, useCallback } from 'react';

import type { ContinueHandler } from './context';

import { ControlsContext, StateContext } from './context';

/** Footer side: gate state plus the call that runs the registered handler. */
const useStepGate = () => {
  const state = use(StateContext);
  const controls = use(ControlsContext);
  const run = useCallback<ContinueHandler>(
    async () => (await controls?.handlerRef.current?.()) ?? false,
    [controls],
  );

  return { ...state, run };
};

export { useStepGate };
