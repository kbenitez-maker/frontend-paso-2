'use client';

import { createContext } from 'react';

import type { RefObject } from 'react';

/** What the footer needs to know about the step on screen. */
interface GateState {
  canContinue: boolean;
  isPending: boolean;
  /** Replaces the footer's "Continue" label while the step is on screen. */
  nextLabel?: string | undefined;
}

/** Saves the step; resolves `true` when the footer may navigate on. */
type ContinueHandler = () => Promise<boolean>;

interface GateControls {
  setState: (state: GateState) => void;
  handlerRef: RefObject<ContinueHandler | null>;
}

const CLOSED: GateState = { canContinue: false, isPending: false };

const StateContext = createContext<GateState>(CLOSED);

const ControlsContext = createContext<GateControls | null>(null);

export {
  CLOSED,
  ControlsContext,
  StateContext,
  type ContinueHandler,
  type GateState,
};
