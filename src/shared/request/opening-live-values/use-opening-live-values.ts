'use client';

import { use } from 'react';

import type { OpeningLiveValues } from './context';

import { LiveContext } from './context';

/**
 * Unsaved values of the opening section on screen; `undefined` when no
 * section is mounted or outside `OpeningLiveValuesProvider`.
 */
const useOpeningLiveValues = (): OpeningLiveValues | undefined =>
  use(LiveContext);

export { useOpeningLiveValues };
