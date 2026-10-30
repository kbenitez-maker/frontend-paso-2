import { describe, expect, it } from 'vitest';

import { contractOf, hasFields, isContractStep } from '@/contracts';
import { STEPS } from '@/lib/constants/steps';
import { routeBlocks } from '@/lib/related-parties';
import { MATRICES } from '@/test/related-party-matrix';

import { visibleBlocks, visibleTargets } from '../visible-targets';

describe('visibleBlocks', () => {
  it('lists the company blocks the country has, in registry order', () => {
    expect(visibleBlocks('company', 'NI')).toEqual([
      'identification',
      'contact',
      'shares',
      'declarations',
      'address',
      'branches',
      'coverage',
      'lawyer',
    ]);
    expect(visibleBlocks('company', 'HN')).toContain('governance');
    expect(visibleBlocks('company', 'NI')).not.toContain('governance');
  });

  it('is empty for the company step until the country is known', () => {
    expect(visibleBlocks('company', undefined)).toEqual([]);
  });

  it('keeps only the related-parties blocks of the route, none while it loads', () => {
    expect(visibleBlocks('related-parties', 'NI')).toEqual([]);
    expect(
      visibleBlocks('related-parties', 'NI', routeBlocks(MATRICES.C, {})),
    ).toEqual(['trust-administrators', 'trust-parties', 'trust-closing']);
    expect(
      visibleBlocks(
        'related-parties',
        'NI',
        routeBlocks(MATRICES.A, { holder_is_listed: true }),
      ),
    ).toEqual(['holder-listing', 'administrators']);
  });

  it('lists every block of the steps without registry fields', () => {
    for (const step of STEPS.filter(({ slug }) => !hasFields(slug))) {
      expect(visibleBlocks(step.slug, 'NI')).toEqual(step.blocks);
    }
  });
});

describe('visibleTargets', () => {
  it('flattens the visible blocks across steps, in rail order', () => {
    const related = routeBlocks(MATRICES.B, {});
    const expected = STEPS.flatMap((step) =>
      (step.slug === 'related-parties' ? ['administrators']
      : isContractStep(step.slug) && hasFields(step.slug) ?
        contractOf(step.slug).blocksByCountry.SV.map(({ key }) => key)
      : step.blocks
      ).map((block) => ({ step: step.slug, block })),
    );

    expect(visibleTargets('SV', related)).toEqual(expected);
    expect(expected[0]).toEqual({ step: 'company', block: 'identification' });
  });

  it('takes the economic-activity blocks from the opening sections', () => {
    const activity = visibleTargets(
      undefined,
      undefined,
      undefined,
      undefined,
      ['tax-id', 'activity'],
    ).filter(({ step }) => step === 'economic-activity');

    expect(activity).toEqual([
      { step: 'economic-activity', block: 'tax-id' },
      { step: 'economic-activity', block: 'activity' },
    ]);
  });

  it('takes the company blocks from the opening sections, even without a country', () => {
    const company = visibleTargets(undefined, undefined, undefined, [
      'contact',
      'identification',
    ]).filter(({ step }) => step === 'company');

    expect(company).toEqual([
      { step: 'company', block: 'contact' },
      { step: 'company', block: 'identification' },
    ]);
  });

  it('falls back to the country blocks when the opening sections are empty', () => {
    expect(visibleTargets('NI', undefined, undefined, [])).toEqual(
      visibleTargets('NI'),
    );
  });
});
