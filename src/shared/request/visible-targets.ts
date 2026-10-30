import type { BlockOf, StepSlug, StepTarget } from '@/lib/constants/steps';
import type { RouteBlock } from '@/lib/related-parties';
import type { BlockProgress } from '@/server/api/account-requests';
import type { CountryCode } from '@/types/domain';

import { contractOf, hasFields, isContractStep } from '@/contracts';
import { findStep, STEPS } from '@/lib/constants/steps';

/** Checklist blocks of the people registered in related parties: listed only when they hold documents (POC). */
const PEOPLE_DOCUMENT_BLOCKS: ReadonlySet<string> = new Set([
  'representatives-documents',
  'board-documents',
  'shareholders-documents',
  'fiduciary-documents',
]);

/**
 * Blocks of a step the request actually has. Steps with registry fields take
 * their blocks from the generated contract (blocks with no applicable field
 * for the country are hidden; empty while the country is unknown); the other
 * steps list every block until their overlay maps fields. Related parties also
 * keep only the blocks of the company's route (`related`; empty while it loads),
 * and the checklist only the people blocks with documents (`progress`; all of
 * them while it loads, so the footer never loses the block on screen).
 */
const visibleBlocks = (
  slug: StepSlug,
  country: CountryCode | undefined,
  related?: readonly RouteBlock[],
  progress?: readonly BlockProgress[],
  companyBlocks?: readonly BlockOf<'company'>[],
  economicBlocks?: readonly BlockOf<'economic-activity'>[],
): readonly BlockOf<StepSlug>[] => {
  if (
    slug === 'company' &&
    companyBlocks !== undefined &&
    companyBlocks.length > 0
  ) {
    return companyBlocks;
  }
  if (
    slug === 'economic-activity' &&
    economicBlocks !== undefined &&
    economicBlocks.length > 0
  ) {
    return economicBlocks;
  }
  if (slug === 'document-checklist') {
    return findStep(slug).blocks.filter(
      (block) =>
        progress === undefined ||
        !PEOPLE_DOCUMENT_BLOCKS.has(block) ||
        (progress.find((entry) => entry.key === block)?.total_fields ?? 0) > 0,
    );
  }
  if (!isContractStep(slug) || !hasFields(slug)) return findStep(slug).blocks;
  if (country === undefined) return [];

  // eslint-disable-next-line security/detect-object-injection -- `country` is a `CountryCode`
  const blocks = contractOf(slug).blocksByCountry[country].map(
    (block) => block.key,
  );
  if (slug !== 'related-parties') return blocks;

  return blocks.filter((block) =>
    (related ?? []).some((entry) => entry.key === block),
  );
};

/**
 * Flat ordered list of visible blocks across every step, for prev/next. The
 * company and economic-activity blocks of the opening-request API replace the
 * registry ones, as in the rail.
 */
const visibleTargets = (
  country: CountryCode | undefined,
  related?: readonly RouteBlock[],
  checklist?: readonly BlockProgress[],
  companyBlocks?: readonly BlockOf<'company'>[],
  economicBlocks?: readonly BlockOf<'economic-activity'>[],
): StepTarget[] =>
  STEPS.flatMap((step) =>
    visibleBlocks(
      step.slug,
      country,
      related,
      checklist,
      companyBlocks,
      economicBlocks,
    ).map((block): StepTarget => ({
      step: step.slug,
      block,
    })),
  );

export { visibleBlocks, visibleTargets };
