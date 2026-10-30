'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { toast } from '@lafise/onyx-ui/status/toast';

import { useAutosaveReporter } from './autosave-state';

const DEFAULT_DELAY_MS = 800;

/** Saves the given keys (e.g. form sections); a rejection means they were not saved. */
type SaveKeys = (keys: string[]) => Promise<void>;

/**
 * Debounced autosave. `markDirty` queues a key and restarts the timer; when
 * the user pauses, `save` gets every queued key at once. A transient failure
 * puts its keys back, so the next change retries them. A `TypeError` is the
 * shape of the data: putting it back would save the same payload again.
 * Whatever is pending when the component unmounts is flushed, so navigating
 * away loses nothing.
 */
const useAutosave = (save: SaveKeys, delayMs = DEFAULT_DELAY_MS) => {
  const t = useTranslations('Form.saveFailed');
  const reporter = useAutosaveReporter();
  const pendingRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestSaveRef = useRef(save);

  useEffect(() => {
    latestSaveRef.current = save;
  });

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    pendingRef.current.clear();
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    const keys = [...pendingRef.current];
    pendingRef.current.clear();
    if (keys.length === 0) return;

    reporter.saving();
    try {
      await latestSaveRef.current(keys);
      reporter.saved();
    } catch (error) {
      if (!(error instanceof TypeError)) {
        keys.forEach((key) => pendingRef.current.add(key));
      }
      reporter.failed();
      toast.error({ heading: t('title'), description: t('description') });
    }
  }, [reporter, t]);

  const markDirty = useCallback(
    (key: string) => {
      pendingRef.current.add(key);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    [flush, delayMs],
  );

  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  return { markDirty, flush, cancel };
};

export { useAutosave, type SaveKeys };
