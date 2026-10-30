'use client';

import { useSyncExternalStore } from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

const subscribeCoarsePointer = (onStoreChange: () => void): (() => void) => {
  const media = globalThis.matchMedia(COARSE_POINTER_QUERY);
  media.addEventListener('change', onStoreChange);
  return () => {
    media.removeEventListener('change', onStoreChange);
  };
};

const getCoarsePointerSnapshot = (): boolean =>
  globalThis.matchMedia(COARSE_POINTER_QUERY).matches;

/** True on touch-first devices where hover tooltips are unreliable. */
const useCoarsePointer = (): boolean =>
  useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    () => false,
  );

export { useCoarsePointer };
