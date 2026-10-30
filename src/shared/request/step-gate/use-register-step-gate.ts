'use client';

import { use, useEffect } from 'react';

import type { ContinueHandler, GateState } from './context';

import { CLOSED, ControlsContext } from './context';

/** Step side: publishes the gate while mounted and closes it on unmount. */
const useRegisterStepGate = ({
  canContinue,
  isPending,
  nextLabel,
  onContinue,
}: GateState & { onContinue: ContinueHandler }): void => {
  const controls = use(ControlsContext);

  useEffect(() => {
    if (controls) controls.handlerRef.current = onContinue;
  });

  useEffect(() => {
    controls?.setState({ canContinue, isPending, nextLabel });
  }, [controls, canContinue, isPending, nextLabel]);

  useEffect(
    () => () => {
      if (!controls) return;
      controls.handlerRef.current = null;
      controls.setState(CLOSED);
    },
    [controls],
  );
};

export { useRegisterStepGate };
