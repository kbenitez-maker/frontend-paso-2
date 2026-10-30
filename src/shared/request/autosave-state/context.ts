'use client';

import { createContext, use } from 'react';

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveState {
  status: AutosaveStatus;
  /** When the last save succeeded; `null` until the first one. */
  savedAt: Date | null;
}

/** Stable setters: reporting a save never re-renders the form that reports it. */
interface AutosaveReporter {
  saving: () => void;
  saved: () => void;
  failed: () => void;
}

const INITIAL: AutosaveState = { status: 'idle', savedAt: null };

const StateContext = createContext<AutosaveState>(INITIAL);

const NOOP_REPORTER: AutosaveReporter = {
  saving: () => undefined,
  saved: () => undefined,
  failed: () => undefined,
};

const ReporterContext = createContext<AutosaveReporter>(NOOP_REPORTER);

const useAutosaveState = (): AutosaveState => use(StateContext);

const useAutosaveReporter = (): AutosaveReporter => use(ReporterContext);

export {
  INITIAL,
  ReporterContext,
  StateContext,
  useAutosaveReporter,
  useAutosaveState,
  type AutosaveReporter,
  type AutosaveState,
  type AutosaveStatus,
};
