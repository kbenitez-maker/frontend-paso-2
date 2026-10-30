'use client';

import { createContext } from 'react';

/** Unsaved form values of the opening section on screen. */
interface OpeningLiveValues {
  sectionCode: string;
  values: Record<string, unknown>;
}

type OpeningLiveValuesSetter = (next: OpeningLiveValues | undefined) => void;

const LiveContext = createContext<OpeningLiveValues | undefined>(undefined);
const ControlsContext = createContext<OpeningLiveValuesSetter | null>(null);

export { ControlsContext, LiveContext, type OpeningLiveValues };
