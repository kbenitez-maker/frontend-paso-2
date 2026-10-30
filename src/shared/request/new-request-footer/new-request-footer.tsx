'use client';

import { routes } from '@/lib/routes';

import { HelpButton } from '../help-button';
import { StepFooter } from '../step-footer';
import { useStepGate } from '../step-gate';

/**
 * Footer of `/new`. Going back leaves the zone for the requests list; the
 * screen on view owns what "Continue" does (verify the company, then create
 * the request) and its label, through the step gate.
 */
const NewRequestFooter = () => {
  const gate = useStepGate();

  return (
    <StepFooter
      previousExternalHref={routes.external.requests()}
      nextLabel={gate.nextLabel}
      nextDisabled={!gate.canContinue}
      nextPending={gate.isPending}
      onNext={() => {
        void gate.run();
      }}
      help={<HelpButton />}
    />
  );
};

export { NewRequestFooter };
