import { StepForm } from '@/shared/step-form/step-form';

import { ApprovalsBlock } from '../approvals-block';
import { FeaturesBlock } from '../features-block';
import { BANCANET_ICONS } from './field-icons';

interface BancanetStepProps {
  requestId: string;
}

/** Step 5, "Bancanet": the registry-driven form of the bancanet overlay. */
const BancanetStep = ({ requestId }: Readonly<BancanetStepProps>) => (
  <StepForm
    step='bancanet'
    requestId={requestId}
    icons={BANCANET_ICONS}
    blocks={{ approvals: ApprovalsBlock, features: FeaturesBlock }}
  />
);

export { BancanetStep, type BancanetStepProps };
