'use client';

import { useTranslations } from 'next-intl';

import { Text } from '@lafise/onyx-ui/typography/text';

import { isBlockOf } from '@/lib/constants/steps';
import { openingBlockOf } from '@/lib/opening';
import { routeBlockTitle } from '@/lib/related-parties';

import { AutosaveIndicator } from '../autosave-indicator';
import { useCurrentStep } from '../use-current-step';
import { useOpeningCompanyBlocks } from '../use-opening-company-blocks';
import { useOpeningEconomicActivityBlocks } from '../use-opening-economic-activity-blocks';
import { useRelatedPartiesRoute } from '../use-related-parties-route';
import { stepProgressTheme } from './themes';

const { root, title, subtitle } = stepProgressTheme();

interface StepProgressProps {
  requestId: string;
}

/**
 * Header title of the form steps: "Step N of 7", "{step} · Section: {block}"
 * and the autosave status as the third line (it informs, it is not an action).
 */
const StepProgress = ({ requestId }: Readonly<StepProgressProps>) => {
  const t = useTranslations('Steps');
  const { step, block, number, total } = useCurrentStep();
  const { matrix } = useRelatedPartiesRoute(requestId);
  const company = useOpeningCompanyBlocks(requestId);
  const economic = useOpeningEconomicActivityBlocks(requestId);

  if (!step || !block) return null;

  const openingTitle =
    company.sections.find((section) => openingBlockOf(section.code) === block)
      ?.display_name ??
    economic.sections.find((section) => section.code === block)?.display_name;

  return (
    <div className={root()}>
      <Text size='lg' className={title()}>
        {t('progress', { current: number, total })}
      </Text>
      <Text size='sm' className={subtitle()}>
        {t('subtitle', {
          step: t(`${step.titleKey}.title`),
          block:
            openingTitle ??
            t(
              `blocks.${isBlockOf('related-parties', block) ? routeBlockTitle(block, matrix) : block}`,
            ),
        })}
      </Text>
      <AutosaveIndicator />
    </div>
  );
};

export { StepProgress, type StepProgressProps };
