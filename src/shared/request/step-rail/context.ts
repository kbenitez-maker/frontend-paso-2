'use client';

import { createContext, use } from 'react';

import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { RequestProgress } from '@/server/api/account-requests';
import type { CountryCode } from '@/types/domain';

/** State of the rail shared by its parts. */
interface StepRailContextValue {
  requestId: string;
  /** Country of the request; unknown until the request loads. */
  country: CountryCode | undefined;
  /** `undefined` until the progress loads. */
  progress: RequestProgress | undefined;
  currentStep: StepSlug | undefined;
  currentBlock: BlockOf<StepSlug> | undefined;
  /** Blocks listed but waiting for an earlier one (POC `esperaA`). */
  waiting: ReadonlySet<string>;
  /** Title of a block (route-specific in related parties). */
  titleOf: (block: BlockOf<StepSlug>) => string;
}

const StepRailContext = createContext<StepRailContextValue | undefined>(
  undefined,
);

const useStepRail = (): StepRailContextValue => {
  const context = use(StepRailContext);
  if (context === undefined) {
    throw new Error('useStepRail must be used within a StepRail');
  }
  return context;
};

export { StepRailContext, useStepRail, type StepRailContextValue };
