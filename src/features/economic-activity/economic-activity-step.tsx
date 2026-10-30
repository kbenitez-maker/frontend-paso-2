import { OpeningSectionForm } from '@/shared/request/opening-section-form';

import { ECONOMIC_ACTIVITY_ICONS } from './lib/field-icons';

interface EconomicActivityStepProps {
  requestId: string;
}

/** Step 2: every economic-activity section comes from the opening-request sections API. */
const EconomicActivityStep = ({
  requestId,
}: Readonly<EconomicActivityStepProps>) => (
  <OpeningSectionForm requestId={requestId} icons={ECONOMIC_ACTIVITY_ICONS} />
);

export { EconomicActivityStep, type EconomicActivityStepProps };
