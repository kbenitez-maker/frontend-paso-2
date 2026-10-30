const chains = new Map<string, Promise<void>>();

const keyOf = (requestId: string, stepCode: string): string =>
  `${requestId}\0${stepCode}`;

/**
 * Serializes saves of one opening-request step. The answer PUT replaces the
 * whole payload, so the next section must read the cache only after the
 * previous write finished. Another step does not wait. The chain outlives
 * the component that started it: unmount must not drop an in-flight save.
 */
const enqueueOpeningStepSave = <T>(
  requestId: string,
  stepCode: string,
  save: () => Promise<T>,
): Promise<T> => {
  const key = keyOf(requestId, stepCode);
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.then(save, save);
  const settled: Promise<void> = run
    .then(
      () => undefined,
      () => undefined,
    )
    .then(() => {
      if (chains.get(key) === settled) chains.delete(key);
    });
  chains.set(key, settled);
  return run;
};

export { enqueueOpeningStepSave };
