'use client';

import { usePathname, useRouter } from 'next/navigation';

import { routes } from '@/lib/routes';

import { HelpButton } from '../help-button';
import { StepFooter } from '../step-footer';
import { useStepGate } from '../step-gate';

/** Screens of the flow layout; each decides through the step gate when (and after saving what) it may go on. */
const FLOW_SCREENS = [
  'profile',
  'base-documents',
  'survey',
  'submitted',
] as const;

const FLOW_SCREEN_NAMES: readonly (string | undefined)[] = FLOW_SCREENS;

interface FlowFooterProps {
  requestId: string;
}

/** Where each flow screen goes back to and on to; `nextHref` is `undefined` when it leaves for the home zone. */
const linksOf = (screen: string | undefined, requestId: string) => {
  switch (screen) {
    case 'profile':
      return {
        previous: { previousExternalHref: routes.external.requests() },
        nextHref: routes.baseDocuments(requestId),
      };
    case 'base-documents':
      return {
        previous: { previousHref: routes.profile(requestId) },
        nextHref: routes.step(requestId, 'company'),
      };
    case 'survey':
      return {
        previous: {},
        nextHref: routes.submitted(requestId, { rated: true }),
      };
    default:
      return { previous: {}, nextHref: undefined };
  }
};

/**
 * Footer of the flow screens (POC LayoutPaso). The profile goes back to the
 * requests list and on to the base documents, which go back to the profile
 * and on to the form. Survey and submitted have no way back: the survey goes
 * on to the submitted screen, which leaves for the requests list in home.
 */
const FlowFooter = ({ requestId }: Readonly<FlowFooterProps>) => {
  const screen = usePathname().split('/').at(-1);
  const router = useRouter();
  const gate = useStepGate();

  if (!FLOW_SCREEN_NAMES.includes(screen)) return null;

  const { previous, nextHref } = linksOf(screen, requestId);

  return (
    <StepFooter
      {...previous}
      nextLabel={gate.nextLabel}
      nextDisabled={!gate.canContinue}
      nextPending={gate.isPending}
      onNext={() => {
        void gate.run().then((canGo) => {
          if (!canGo) return;
          // The requests list lives in the home zone: a full page load.
          if (nextHref === undefined) {
            globalThis.location.assign(routes.external.requests());
          } else router.push(nextHref);
        });
      }}
      help={<HelpButton requestId={requestId} />}
    />
  );
};

export { FlowFooter, type FlowFooterProps };
