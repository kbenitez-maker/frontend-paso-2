/**
 * Single registry of the form steps. Order here is the order of the step rail.
 * `titleKey` is the key under the `Steps` i18n namespace.
 */
const STEPS = [
  {
    slug: 'company',
    titleKey: 'company',
    blocks: [
      'identification',
      'contact',
      'governance',
      'shares',
      'declarations',
      'address',
      'branches',
      'parent-company',
      'tax-residence',
      'coverage',
      'lawyer',
      'administering-company',
    ],
  },
  {
    slug: 'economic-activity',
    titleKey: 'economicActivity',
    blocks: [
      'activity',
      'tax-id',
      'stock-exchange',
      'financial',
      'other-institutions',
      'counterparties',
    ],
  },
  {
    slug: 'related-parties',
    titleKey: 'relatedParties',
    // Which blocks a request has comes from its route (see `src/lib/related-parties.ts`).
    blocks: [
      'holder-listing',
      'administrators',
      'shareholders',
      'trust-administrators',
      'trust-parties',
      'trust-closing',
    ],
  },
  {
    slug: 'references-accounts',
    titleKey: 'referencesAccounts',
    blocks: ['references', 'accounts'],
  },
  {
    slug: 'bancanet',
    titleKey: 'bancanet',
    blocks: ['superusers', 'approvals', 'features'],
  },
  {
    slug: 'document-checklist',
    titleKey: 'documentChecklist',
    blocks: [
      'confirm',
      'legal-documents',
      // One per role of the people registered in related parties; listed only when they hold documents.
      'representatives-documents',
      'board-documents',
      'shareholders-documents',
      'fiduciary-documents',
      'financial-documents',
      'regulatory-documents',
      'document-declarations',
    ],
  },
  {
    slug: 'signature',
    titleKey: 'signature',
    blocks: ['bank-documents'],
  },
] as const;

type Step = (typeof STEPS)[number];

type StepSlug = Step['slug'];

type BlockOf<S extends StepSlug> = Extract<Step, { slug: S }>['blocks'][number];

const findStep = (slug: StepSlug): Step => {
  const step = STEPS.find((candidate) => candidate.slug === slug);
  // `slug` is a `StepSlug`, so the lookup cannot miss.
  if (!step) throw new Error(`Unknown step: ${slug}`);
  return step;
};

const isStepSlug = (value: unknown): value is StepSlug =>
  STEPS.some((step) => step.slug === value);

const isBlockOf = <S extends StepSlug>(
  slug: S,
  value: unknown,
): value is BlockOf<S> => {
  const blocks: readonly unknown[] = findStep(slug).blocks;
  return blocks.includes(value);
};

/** A block of a step; `block` is any block key of that step. */
interface StepTarget {
  step: StepSlug;
  block: BlockOf<StepSlug>;
}

interface AdjacentTargets {
  /** `null` on the first block of the first step: leave the form backwards. */
  previous: StepTarget | null;
  /** `null` on the last block of the last step. */
  next: StepTarget | null;
}

/**
 * Previous and next block around `step`/`block` in `targets`, the flat ordered
 * list of the blocks visible for the request (see `visibleTargets`). When the
 * current block is not in the list, there is nothing to go to.
 */
const adjacentStepTargets = (
  targets: readonly StepTarget[],
  step: StepSlug,
  block: BlockOf<StepSlug>,
): AdjacentTargets => {
  const index = targets.findIndex(
    (target) => target.step === step && target.block === block,
  );
  if (index === -1) return { previous: null, next: null };

  return {
    previous: targets[index - 1] ?? null,
    next: targets[index + 1] ?? null,
  };
};

export {
  adjacentStepTargets,
  findStep,
  isBlockOf,
  isStepSlug,
  STEPS,
  type AdjacentTargets,
  type BlockOf,
  type Step,
  type StepSlug,
  type StepTarget,
};
