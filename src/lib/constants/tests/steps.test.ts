import type { StepTarget } from '../steps';

import { describe, expect, it } from 'vitest';

import {
  adjacentStepTargets,
  findStep,
  isBlockOf,
  isStepSlug,
  STEPS,
} from '../steps';

describe('STEPS', () => {
  it('keeps the agreed order', () => {
    expect(STEPS.map((step) => step.slug)).toEqual([
      'company',
      'economic-activity',
      'related-parties',
      'references-accounts',
      'bancanet',
      'document-checklist',
      'signature',
    ]);
  });

  it('has unique slugs and title keys', () => {
    expect(new Set(STEPS.map((step) => step.slug)).size).toBe(STEPS.length);
    expect(new Set(STEPS.map((step) => step.titleKey)).size).toBe(STEPS.length);
  });
});

describe('isStepSlug', () => {
  it('accepts registered slugs only', () => {
    expect(isStepSlug('company')).toBe(true);
    expect(isStepSlug('profile')).toBe(false);
    expect(isStepSlug(undefined)).toBe(false);
  });
});

describe('isBlockOf', () => {
  it('accepts blocks that belong to the step', () => {
    expect(isBlockOf('company', 'lawyer')).toBe(true);
    expect(isBlockOf('bancanet', 'superusers')).toBe(true);
  });

  it('rejects blocks of other steps and non-strings', () => {
    expect(isBlockOf('company', 'superusers')).toBe(false);
    expect(isBlockOf('company', 1)).toBe(false);
  });
});

describe('findStep', () => {
  it('returns the registry entry', () => {
    expect(findStep('signature').titleKey).toBe('signature');
  });
});

describe('adjacentStepTargets', () => {
  const targets: StepTarget[] = [
    { step: 'company', block: 'identification' },
    { step: 'company', block: 'contact' },
    { step: 'company', block: 'coverage' },
    { step: 'economic-activity', block: 'activity' },
    { step: 'economic-activity', block: 'financial' },
  ];

  it('moves between the visible blocks of the same step', () => {
    expect(adjacentStepTargets(targets, 'company', 'contact')).toEqual({
      previous: { step: 'company', block: 'identification' },
      next: { step: 'company', block: 'coverage' },
    });
  });

  it('skips blocks that are not in the visible list', () => {
    // `governance`, `shares`, ... are hidden for this request: not in `targets`.
    expect(
      adjacentStepTargets(targets, 'company', 'identification').next,
    ).toEqual({ step: 'company', block: 'contact' });
  });

  it('crosses to the next and previous step', () => {
    expect(adjacentStepTargets(targets, 'company', 'coverage').next).toEqual({
      step: 'economic-activity',
      block: 'activity',
    });
    expect(
      adjacentStepTargets(targets, 'economic-activity', 'activity').previous,
    ).toEqual({ step: 'company', block: 'coverage' });
  });

  it('has no previous target on the first block', () => {
    expect(
      adjacentStepTargets(targets, 'company', 'identification').previous,
    ).toBeNull();
  });

  it('has no next target on the last block', () => {
    expect(
      adjacentStepTargets(targets, 'economic-activity', 'financial').next,
    ).toBeNull();
  });

  it('has nowhere to go from a block that is not visible', () => {
    expect(adjacentStepTargets(targets, 'company', 'governance')).toEqual({
      previous: null,
      next: null,
    });
  });
});
