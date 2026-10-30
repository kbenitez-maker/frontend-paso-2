'use client';

import type { ContractStep } from '@/contracts';

import { useMessages } from 'next-intl';

/** Generated i18n namespace (`i18n/<locale>/<step>-fields.json`) of each step's field labels. */
const LABEL_NAMESPACES = {
  company: 'CompanyFields',
  'economic-activity': 'EconomicActivityFields',
  'related-parties': 'RelatedPartiesFields',
  'references-accounts': 'ReferencesAccountsFields',
  bancanet: 'BancanetFields',
} as const satisfies Record<ContractStep, string>;

/**
 * Label lookup for the fields of a step. Keys come from the registry at
 * runtime, so the lookup is by string; a field without copy falls back to its
 * key rather than rendering nothing.
 */
const useFieldLabels = (step: ContractStep) => {
  const labels: Readonly<Record<string, string>> =
    // eslint-disable-next-line security/detect-object-injection -- `step` is a registry step
    useMessages()[LABEL_NAMESPACES[step]].labels;

  return (key: string, variant?: string): string =>
    (variant === undefined ? undefined : labels[`${key}_${variant}`]) ??
    // eslint-disable-next-line security/detect-object-injection -- keys come from the registry
    labels[key] ??
    key;
};

export { useFieldLabels };
