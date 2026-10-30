'use client';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { adjacentStepTargets, STEPS } from '@/lib/constants/steps';
import { routes } from '@/lib/routes';
import { requestProgressQuery } from '@/server/api';

import { HelpButton } from '../help-button';
import { StepFooter } from '../step-footer';
import { useStepGate } from '../step-gate';
import { useCurrentStep } from '../use-current-step';
import { useOpeningCompanyBlocks } from '../use-opening-company-blocks';
import { useOpeningEconomicActivityBlocks } from '../use-opening-economic-activity-blocks';
import { usePreviewBank } from '../use-preview-bank';
import { useRelatedPartiesRoute } from '../use-related-parties-route';
import { useRequestCountry } from '../use-request-country';
import { visibleTargets } from '../visible-targets';

const RELATED_PARTIES_AT = STEPS.findIndex(
  (entry) => entry.slug === 'related-parties',
);

/** Steps whose first click depends on the company overview. */
enum Step {
  Company = 'company',
  EconomicActivity = 'economic-activity',
  DocumentChecklist = 'document-checklist',
}

// String copies: step.slug is a slug union, so comparing it to the enum
// directly trips no-unsafe-enum-comparison.
const COMPANY: string = Step.Company;
const ECONOMIC_ACTIVITY: string = Step.EconomicActivity;
const DOCUMENT_CHECKLIST: string = Step.DocumentChecklist;

interface FormFooterProps {
  requestId: string;
}

/**
 * Footer of the form steps: previous/next come from the step registry. Going
 * back from the very first block leaves the form for the base documents;
 * going on from the very last one leaves it for the survey.
 */
const FormFooter = ({ requestId }: Readonly<FormFooterProps>) => {
  const { step, block } = useCurrentStep();
  const bank = usePreviewBank();
  const country = useRequestCountry(requestId);
  const router = useRouter();
  const gate = useStepGate();
  const { blocks: related, isError: relatedFailed } =
    useRelatedPartiesRoute(requestId);
  const { blocks: companyBlocks, isPending: companyPending } =
    useOpeningCompanyBlocks(requestId);
  const { blocks: economicBlocks } =
    useOpeningEconomicActivityBlocks(requestId);
  // The checklist lists the people blocks that hold documents (same query as the rail).
  const { data: progress } = useQuery({
    ...requestProgressQuery(requestId),
    throwOnError: false,
  });
  const help = <HelpButton requestId={requestId} />;

  if (!step || !block) return <StepFooter help={help} />;

  // An empty list is also what a failure looks like. While the overview is
  // still loading, the registry order would send the first click to the
  // wrong company block. Only that step and the border with economic
  // activity read the list; later steps keep Back and Next.
  if (
    companyPending &&
    (step.slug === COMPANY || step.slug === ECONOMIC_ACTIVITY)
  ) {
    return <StepFooter help={help} />;
  }

  // The step before related parties ends on that route, and every later
  // step follows it. They wait until the route loads. A failed request,
  // identification, or matrix is not a load: waiting would leave Back gone.
  const stepAt = STEPS.findIndex((entry) => entry.slug === step.slug);
  if (
    stepAt >= RELATED_PARTIES_AT - 1 &&
    related === undefined &&
    !relatedFailed
  ) {
    return <StepFooter help={help} />;
  }

  const targets = visibleTargets(
    country,
    related ?? [],
    progress?.steps.find((entry) => entry.slug === DOCUMENT_CHECKLIST)?.blocks,
    companyBlocks,
    economicBlocks,
  );
  const placed = targets.some(
    (target) => target.step === step.slug && target.block === block,
  );
  if (!placed) return <StepFooter help={help} />;

  const { previous, next } = adjacentStepTargets(targets, step.slug, block);

  const nextHref =
    next ?
      routes.step(requestId, next.step, { block: next.block, bank })
    : routes.survey(requestId);

  // The step on screen decides when it may continue and saves before leaving.
  const goNext = async () => {
    if (await gate.run()) router.push(nextHref);
  };

  return (
    <StepFooter
      previousHref={
        previous ?
          routes.step(requestId, previous.step, { block: previous.block, bank })
        : routes.baseDocuments(requestId)
      }
      nextHref={nextHref}
      nextLabel={gate.nextLabel}
      nextDisabled={!gate.canContinue}
      onNext={() => {
        void goNext();
      }}
      nextPending={gate.isPending}
      help={help}
    />
  );
};

export { FormFooter, type FormFooterProps };
