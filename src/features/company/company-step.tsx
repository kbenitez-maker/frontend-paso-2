'use client';

import { OpeningSectionForm } from '@/shared/request/opening-section-form';

import { COMPANY_ICONS } from './lib/field-icons';

interface CompanyStepProps {
  requestId: string;
}

/** Step 1: every company section comes from the opening-request sections API. */
const CompanyStep = ({ requestId }: Readonly<CompanyStepProps>) => (
  <OpeningSectionForm requestId={requestId} icons={COMPANY_ICONS} />
);

export { CompanyStep, type CompanyStepProps };
