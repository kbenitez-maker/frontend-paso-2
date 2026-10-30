'use client';

import { useCallback, useMemo, useState } from 'react';

import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { StepRailContextValue } from './context';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { isBlockOf, STEPS } from '@/lib/constants/steps';
import { openingBlockOf } from '@/lib/opening';
import { routeBlockTitle } from '@/lib/related-parties';
import { requestProgressQuery } from '@/server/api';

import { useCurrentStep } from '../use-current-step';
import { useOpeningCompanyBlocks } from '../use-opening-company-blocks';
import { useOpeningEconomicActivityBlocks } from '../use-opening-economic-activity-blocks';
import { useRelatedPartiesRoute } from '../use-related-parties-route';
import { useRequestCountry } from '../use-request-country';
import { visibleBlocks } from '../visible-targets';
import { StepRailContext } from './context';
import { RailHeader } from './rail-header';
import { RailStep } from './rail-step';
import { stepRailTheme } from './themes';
import { useOpeningCompanyProgress } from './use-opening-company-progress';

const { nav, steps } = stepRailTheme();

interface StepRailProps {
  requestId: string;
}

/**
 * Fixed left rail of the form: request country, overall progress and the
 * collapsible steps with their blocks. Hidden below 1280px; stops above the
 * 72px footer. The current step starts open; the user can toggle any step.
 */
const StepRailRoot = ({ requestId }: Readonly<StepRailProps>) => {
  const t = useTranslations('Steps');
  const { step: currentStep, block } = useCurrentStep();
  const [toggled, setToggled] = useState<Partial<Record<StepSlug, boolean>>>(
    {},
  );

  // Rail data is decoration: failures leave the rail without counts.
  const country = useRequestCountry(requestId);
  const related = useRelatedPartiesRoute(requestId);
  const { data: progress } = useQuery({
    ...requestProgressQuery(requestId),
    throwOnError: false,
  });
  const { sections: openingSections, blocks: companyBlocks } =
    useOpeningCompanyBlocks(requestId);
  const { sections: economicSections, blocks: economicBlocks } =
    useOpeningEconomicActivityBlocks(requestId);
  const progressForRail = useOpeningCompanyProgress(
    requestId,
    openingSections,
    progress,
  );
  const checklist = progress?.steps.find(
    (entry) => entry.slug === 'document-checklist',
  )?.blocks;
  // Related-parties blocks wait for the route; the checklist ones for the confirmation.
  const waiting = useMemo(
    () =>
      new Set(
        [...(related.blocks ?? []), ...(checklist ?? [])]
          .filter((entry) => entry.waiting === true)
          .map(({ key }) => key),
      ),
    [related.blocks, checklist],
  );
  const titleOf = useCallback<StepRailContextValue['titleOf']>(
    (key) => {
      const openingTitle =
        openingSections.find((section) => openingBlockOf(section.code) === key)
          ?.display_name ??
        economicSections.find((section) => section.code === key)?.display_name;
      if (openingTitle !== undefined) return openingTitle;
      return t(
        `blocks.${isBlockOf('related-parties', key) ? routeBlockTitle(key, related.matrix) : key}`,
      );
    },
    [economicSections, openingSections, related.matrix, t],
  );
  const value = useMemo(
    () => ({
      requestId,
      country,
      progress: progressForRail,
      currentStep: currentStep?.slug,
      currentBlock: block,
      waiting,
      titleOf,
    }),
    [
      requestId,
      country,
      progressForRail,
      currentStep?.slug,
      block,
      waiting,
      titleOf,
    ],
  );
  const blocksOf = useMemo(
    () =>
      STEPS.reduce<Record<StepSlug, readonly BlockOf<StepSlug>[]>>(
        (byStep, step) => {
          // `slug` comes from the step registry, not from a caller.

          byStep[step.slug] = visibleBlocks(
            step.slug,
            country,
            related.blocks,
            checklist,
            companyBlocks,
            economicBlocks,
          );
          return byStep;
        },
        {} as Record<StepSlug, readonly BlockOf<StepSlug>[]>,
      ),
    [country, related.blocks, checklist, companyBlocks, economicBlocks],
  );
  const toggle = useCallback(
    (slug: StepSlug) => {
      setToggled((previous) => ({
        ...previous,
        // `slug` is a step from the registry, not a caller-supplied key.
        // eslint-disable-next-line security/detect-object-injection -- closed StepSlug union
        [slug]: !(previous[slug] ?? slug === currentStep?.slug),
      }));
    },
    [currentStep?.slug],
  );
  const onToggle = useMemo(
    () =>
      STEPS.reduce<Record<StepSlug, () => void>>(
        (handlers, step) => {
          // `slug` comes from the step registry, not from a caller.

          handlers[step.slug] = () => {
            toggle(step.slug);
          };
          return handlers;
        },
        {} as Record<StepSlug, () => void>,
      ),
    [toggle],
  );

  return (
    <StepRailContext value={value}>
      <nav aria-label={t('railLabel')} className={nav()}>
        <RailHeader />

        <ol className={steps()}>
          {STEPS.map((step, index) => {
            const isCurrent = step.slug === currentStep?.slug;

            return (
              <RailStep
                key={step.slug}
                step={step}
                blocks={blocksOf[step.slug]}
                number={index + 1}
                isOpen={toggled[step.slug] ?? isCurrent}
                onToggle={onToggle[step.slug]}
              />
            );
          })}
        </ol>
      </nav>
    </StepRailContext>
  );
};

export { StepRailRoot, type StepRailProps };
