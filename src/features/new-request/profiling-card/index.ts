import { ProfilingCardRoot } from './profiling-card';
import { RequestInProgressNotice } from './request-in-progress-notice';

/**
 * The profiling card of `/new`: `<ProfilingCard />` renders the whole card
 * (the shared card plus the customer lookup that opens its base data).
 */
const ProfilingCard = Object.assign(ProfilingCardRoot, {
  RequestInProgressNotice,
});

export { ProfilingCard };
