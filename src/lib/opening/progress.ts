import type { OpeningCurrentSection } from '@/server/api/account-opening-requests';
import type { BlockProgress, StepState } from '@/server/api/account-requests';
import type { OpeningAnswerContext } from './values';

import { requiredOpeningFields, toOpeningFieldDefinition } from './fields';
import { countsTowardOpeningContinue, isOpeningValueFilled } from './values';

/**
 * Answered versus required fields of one section; optional ones never count.
 * With the request context, a field the screen cannot answer is left out —
 * the same rule Continue uses. Without a context, a phone and a catalog
 * still count.
 */
const openingSectionFieldCount = (
  section: Pick<OpeningCurrentSection, 'fields' | 'values'>,
  context?: OpeningAnswerContext,
): { completed_fields: number; total_fields: number } => {
  const required = requiredOpeningFields(section).filter((field) =>
    context === undefined ?
      toOpeningFieldDefinition(field) !== undefined
    : countsTowardOpeningContinue(field, context),
  );
  return {
    total_fields: required.length,
    completed_fields: required.filter((field) =>
      isOpeningValueFilled(section.values[field.code]),
    ).length,
  };
};

const totalsOf = (counts: readonly BlockProgress[]) =>
  counts.reduce(
    (sum, count) => ({
      completed: sum.completed + count.completed_fields,
      total: sum.total + count.total_fields,
    }),
    { completed: 0, total: 0 },
  );

/** Rail tag of a step from its section counts. */
const openingStepState = (counts: readonly BlockProgress[]): StepState => {
  const { completed, total } = totalsOf(counts);
  if (total > 0 && completed === total) return 'complete';
  return completed > 0 ? 'in_progress' : 'not_started';
};

/** Share of the step's required fields already answered, 0–100. */
const openingStepPercent = (counts: readonly BlockProgress[]): number => {
  const { completed, total } = totalsOf(counts);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

export { openingSectionFieldCount, openingStepPercent, openingStepState };
