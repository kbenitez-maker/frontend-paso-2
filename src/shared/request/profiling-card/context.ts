'use client';

import { createContext, use } from 'react';

import type { BankId, CountryCode } from '@/types/domain';

/** The card has two moments: identify the company, then ask for its base data. */
type Moment = 'identify' | 'base-data';

/** State of the profiling card shared by its parts. */
interface ProfilingCardContextValue {
  bankId: BankId;
  country: CountryCode;
  moment: Moment;
  /**
   * Takes over a change of the legal entity type instead of writing it to the
   * form: an existing request confirms and applies it as a reclassification.
   */
  onEntityTypeChange?: ((code: string) => void) | undefined;
}

const ProfilingCardContext = createContext<ProfilingCardContextValue | null>(
  null,
);

const useProfilingCard = (): ProfilingCardContextValue => {
  const context = use(ProfilingCardContext);
  if (context === null) {
    throw new Error('useProfilingCard must be used within a ProfilingCard');
  }
  return context;
};

export {
  ProfilingCardContext,
  useProfilingCard,
  type Moment,
  type ProfilingCardContextValue,
};
