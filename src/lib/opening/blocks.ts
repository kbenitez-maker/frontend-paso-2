import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { OpeningSectionSummary } from '@/server/api/account-opening-requests';

import { isBlockOf } from '@/lib/constants/steps';

import { ownValueOf } from './own-key';

/** Steps whose sections come from the opening-request API; other steps still use the registry. */
const OPENING_COMPANY_STEP = 'company' satisfies StepSlug;

const OPENING_ECONOMIC_ACTIVITY_STEP = 'economic-activity' satisfies StepSlug;

const OPENING_SECTION_BLOCK = {
  'management-company': 'administering-company',
} as const satisfies Record<string, BlockOf<'company'>>;

const OPENING_BLOCK_SECTION = {
  'administering-company': 'management-company',
} as const satisfies Partial<Record<BlockOf<'company'>, string>>;

/**
 * Company rail block that hosts an opening-request section. A section code
 * the registry does not list has no block: `undefined`.
 */
const openingBlockOf = (
  sectionCode: string,
): BlockOf<'company'> | undefined => {
  const mapped = ownValueOf(OPENING_SECTION_BLOCK, sectionCode);
  if (mapped !== undefined) return mapped;
  return isBlockOf('company', sectionCode) ? sectionCode : undefined;
};

/** Opening-request `section_code` for a company rail block. */
const openingSectionCodeOf = (block: BlockOf<'company'>): string =>
  ownValueOf(OPENING_BLOCK_SECTION, block) ?? block;

/**
 * Company rail blocks in the API section order. Sections without a block are
 * left out.
 */
const openingCompanyBlocks = (
  sections: readonly OpeningSectionSummary[],
): BlockOf<'company'>[] =>
  [...sections]
    .sort((left, right) => left.display_order - right.display_order)
    .flatMap((section) => {
      const block = openingBlockOf(section.code);
      return block === undefined ? [] : [block];
    });

/**
 * Economic-activity rail blocks in the API section order. A section the
 * registry does not list, such as licenses, is left out.
 */
const openingEconomicActivityBlocks = (
  sections: readonly OpeningSectionSummary[],
): BlockOf<'economic-activity'>[] =>
  [...sections]
    .sort((left, right) => left.display_order - right.display_order)
    .flatMap((section) =>
      isBlockOf(OPENING_ECONOMIC_ACTIVITY_STEP, section.code) ?
        [section.code]
      : [],
    );

export {
  OPENING_COMPANY_STEP,
  OPENING_ECONOMIC_ACTIVITY_STEP,
  openingBlockOf,
  openingCompanyBlocks,
  openingEconomicActivityBlocks,
  openingSectionCodeOf,
};
