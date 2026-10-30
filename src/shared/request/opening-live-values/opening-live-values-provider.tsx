'use client';

import { useState } from 'react';

import type { ReactNode } from 'react';
import type { OpeningLiveValues } from './context';

import { ControlsContext, LiveContext } from './context';

interface OpeningLiveValuesProviderProps {
  children: ReactNode;
}

/**
 * Shares the unsaved values of the opening section on screen with the rail,
 * so its field count follows answers that reveal or hide dependent fields
 * before they are saved.
 */
const OpeningLiveValuesProvider = ({
  children,
}: Readonly<OpeningLiveValuesProviderProps>) => {
  const [live, setLive] = useState<OpeningLiveValues | undefined>();

  return (
    <ControlsContext value={setLive}>
      <LiveContext value={live}>{children}</LiveContext>
    </ControlsContext>
  );
};

export { OpeningLiveValuesProvider, type OpeningLiveValuesProviderProps };
