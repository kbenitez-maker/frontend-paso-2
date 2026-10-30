'use client';

import { useMemo } from 'react';

import { StepForm } from '@/shared/step-form/step-form';
import { useStepSections } from '@/shared/step-form/use-step-sections';

interface ReferencesAccountsStepProps {
  requestId: string;
}

/** Field of the economic-activity step the transactional profile is checked against. */
const ANNUAL_SALES = 'annual_sales_usd';

/**
 * Step 4, "References and accounts": the registry-driven form of the
 * references-accounts overlay. The account credits may not exceed the annual
 * sales declared in Economic activity (POC cuentas.ts), so those travel in.
 */
const ReferencesAccountsStep = ({
  requestId,
}: Readonly<ReferencesAccountsStepProps>) => {
  const { bySection } = useStepSections('economic-activity', requestId);
  const sales = bySection.financial?.['annual_sales_usd'];
  const context = useMemo(() => ({ [ANNUAL_SALES]: sales }), [sales]);

  return (
    <StepForm
      step='references-accounts'
      requestId={requestId}
      context={context}
    />
  );
};

export { ReferencesAccountsStep, type ReferencesAccountsStepProps };
