import type { StepTarget } from '@/lib/constants/steps';
import type { RequestProgress } from '@/server/api/account-requests';

import { findStep, isBlockOf } from '@/lib/constants/steps';

/**
 * Where an editable request resumes: the first block still asking for
 * something (fewer filled than applicable, not waiting for an earlier block) of
 * the first step that is not complete; that step's first block when no block
 * says so. With every step complete it resumes at the signature, the last step,
 * whose "Finish" closes the request (POC firma).
 */
const resumeTarget = ({ steps }: RequestProgress): StepTarget => {
  const pending = steps.find((step) => step.state !== 'complete');
  if (pending === undefined) {
    return { step: 'signature', block: findStep('signature').blocks[0] };
  }

  const block = pending.blocks.find(
    (entry) =>
      entry.waiting !== true && entry.completed_fields < entry.total_fields,
  )?.key;

  return {
    step: pending.slug,
    block:
      isBlockOf(pending.slug, block) ? block : findStep(pending.slug).blocks[0],
  };
};

export { resumeTarget };
