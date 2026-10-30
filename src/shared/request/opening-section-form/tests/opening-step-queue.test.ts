import { describe, expect, it } from 'vitest';

import { enqueueOpeningStepSave } from '../opening-step-queue';

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('enqueueOpeningStepSave', () => {
  it('runs saves of the same step one after another', async () => {
    const order: string[] = [];
    const gate = deferred();

    const first = enqueueOpeningStepSave('request', 'company', async () => {
      order.push('first-start');
      await gate.promise;
      order.push('first-end');
    });
    const second = enqueueOpeningStepSave('request', 'company', () => {
      order.push('second');
      return Promise.resolve();
    });

    await Promise.resolve();
    expect(order).toEqual(['first-start']);

    gate.resolve();
    await first;
    await second;
    expect(order).toEqual(['first-start', 'first-end', 'second']);
  });

  it('runs the next save after one fails', async () => {
    const order: string[] = [];
    const failed = enqueueOpeningStepSave('request-2', 'company', () => {
      order.push('fail');
      return Promise.reject(new Error('save failed'));
    });
    const next = enqueueOpeningStepSave('request-2', 'company', () => {
      order.push('next');
      return Promise.resolve();
    });

    await expect(failed).rejects.toThrow('save failed');
    await next;
    expect(order).toEqual(['fail', 'next']);
  });

  it('does not hold a different step behind this one', async () => {
    const gate = deferred();
    let otherStarted = false;

    const waiting = enqueueOpeningStepSave(
      'request-3',
      'company',
      () => gate.promise,
    );
    const other = enqueueOpeningStepSave(
      'request-3',
      'economic-activity',
      () => {
        otherStarted = true;
        return Promise.resolve();
      },
    );

    await other;
    expect(otherStarted).toBe(true);
    gate.resolve();
    await waiting;
  });
});
