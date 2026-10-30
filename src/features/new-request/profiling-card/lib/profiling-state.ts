import type { ProfilingMoment as Moment } from '@/shared/request/profiling-card';
import type { LookupBlock, LookupResult } from './lookup-outcome';

interface ProfilingState {
  moment: Moment;
  /** Why the applicant could not move on; `null` while nothing blocks. */
  block: LookupBlock | null;
}

type ProfilingEvent =
  | { type: 'lookup-answered'; result: LookupResult }
  | { type: 'lookup-failed'; block: LookupBlock }
  | { type: 'retry' };

const INITIAL_PROFILING: ProfilingState = { moment: 'identify', block: null };

/** Only a "new to bank" answer opens the base data; every other outcome stays on the first moment. */
const profilingReducer = (
  state: ProfilingState,
  event: ProfilingEvent,
): ProfilingState => {
  switch (event.type) {
    case 'lookup-answered':
      return event.result.proceed ?
          { moment: 'base-data', block: null }
        : { ...state, block: event.result.block };
    case 'lookup-failed':
      return { ...state, block: event.block };
    case 'retry':
      return { ...state, block: null };
    default:
      return event satisfies never;
  }
};

export type { ProfilingMoment as Moment } from '@/shared/request/profiling-card';

export {
  INITIAL_PROFILING,
  profilingReducer,
  type ProfilingEvent,
  type ProfilingState,
};
