'use client';

import { useTranslations } from 'next-intl';

import { useProfilingCard } from './context';

/**
 * Resolves help copy for profiling fields from `NewRequest.tooltips`.
 * Identification varies by bank country; legal name and annual sales are shared.
 */
const useProfilingTooltip = (
  field: 'identification' | 'legalName' | 'annualSales',
): string => {
  const { country } = useProfilingCard();
  const t = useTranslations('NewRequest.tooltips');
  if (field === 'identification') {
    return t(`identification.${country}`);
  }
  return t(field);
};

export { useProfilingTooltip };
