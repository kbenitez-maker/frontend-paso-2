'use client';

import { useTranslations } from 'next-intl';

import { SectionCard } from '../section-card';
import { useCurrentStep } from '../use-current-step';

/** Placeholder content of a form step: the card of the current block, no fields yet. */
const StepSection = () => {
  const t = useTranslations('Steps');
  const { block } = useCurrentStep();

  return block ? <SectionCard title={t(`blocks.${block}`)} /> : null;
};

export { StepSection };
