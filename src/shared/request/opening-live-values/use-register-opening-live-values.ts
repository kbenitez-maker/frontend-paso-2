'use client';

import { use, useEffect } from 'react';

import { ControlsContext } from './context';

/**
 * Publishes the section's unsaved values while it is mounted and clears them
 * on unmount. `values` must be memoized: every new reference is published.
 * Does nothing outside `OpeningLiveValuesProvider`.
 */
const useRegisterOpeningLiveValues = (
  sectionCode: string,
  values: Record<string, unknown>,
): void => {
  const setLive = use(ControlsContext);

  useEffect(() => {
    setLive?.({ sectionCode, values });
  }, [setLive, sectionCode, values]);

  useEffect(
    () => () => {
      setLive?.(undefined);
    },
    [setLive],
  );
};

export { useRegisterOpeningLiveValues };
