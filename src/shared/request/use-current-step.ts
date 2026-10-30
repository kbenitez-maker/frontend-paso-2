'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { findStep, isBlockOf, isStepSlug, STEPS } from '@/lib/constants/steps';

/**
 * Resolves the form step from the last path segment and the block from the
 * `?block=` query (first block of the step when absent or unknown). `step` and
 * `block` are `undefined` outside the form steps; `number` is 1-based.
 */
const useCurrentStep = () => {
  const slug = usePathname().split('/').at(-1);
  const requested = useSearchParams().get('block');
  const index = STEPS.findIndex((step) => step.slug === slug);
  const step = isStepSlug(slug) ? findStep(slug) : undefined;
  const block =
    step && isBlockOf(step.slug, requested) ? requested : step?.blocks[0];

  return { step, block, number: index + 1, total: STEPS.length };
};

export { useCurrentStep };
