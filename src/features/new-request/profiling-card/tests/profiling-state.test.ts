import { describe, expect, it } from 'vitest';

import { INITIAL_PROFILING, profilingReducer } from '../lib/profiling-state';

describe('profilingReducer', () => {
  it('starts on the identification moment with nothing blocking', () => {
    expect(INITIAL_PROFILING).toEqual({ moment: 'identify', block: null });
  });

  it('opens the base data when the company is new to the bank', () => {
    expect(
      profilingReducer(INITIAL_PROFILING, {
        type: 'lookup-answered',
        result: { proceed: true },
      }),
    ).toEqual({ moment: 'base-data', block: null });
  });

  it('stays on the first moment with the block when the lookup stops the flow', () => {
    expect(
      profilingReducer(INITIAL_PROFILING, {
        type: 'lookup-answered',
        result: { proceed: false, block: 'request_in_progress' },
      }),
    ).toEqual({ moment: 'identify', block: 'request_in_progress' });
  });

  it('keeps the first moment when the lookup fails', () => {
    expect(
      profilingReducer(INITIAL_PROFILING, {
        type: 'lookup-failed',
        block: 'timeout',
      }),
    ).toEqual({ moment: 'identify', block: 'timeout' });
  });

  it('clears the block on retry without changing the moment', () => {
    expect(
      profilingReducer(
        { moment: 'identify', block: 'unavailable' },
        { type: 'retry' },
      ),
    ).toEqual({ moment: 'identify', block: null });
  });
});
