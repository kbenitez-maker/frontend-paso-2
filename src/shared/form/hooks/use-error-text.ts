'use client';

import { useTranslations } from 'next-intl';

const ERROR_CODES = [
  'required',
  'min',
  'max',
  'not_future',
  'max_years_ago',
  'prohibited_country',
  'identification_number',
  'url',
  'email',
  'gte_field',
  'lte_field',
  'read_only',
  'phone',
  'min_items',
  'max_items',
  'powers_not_reviewed',
  'trust_holder_mismatch',
  'beneficiaries_as_class',
  'optional_figures_not_reviewed',
  'unmapped_entity_type',
  'exceeds_share_capital',
  'exceeds_total_assets',
  'credits_exceed_sales',
  'debits_exceed_credits',
  'no_feature_enabled',
  'joint_signers',
  'ownership_cycle',
  'body_name',
  'committee_as_one',
  'party_as_class',
  'person_unlisted',
  'signer_unlisted',
  'superuser_unlisted',
] as const;

type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_CODE_VALUES: readonly string[] = ERROR_CODES;

const isErrorCode = (value: string): value is ErrorCode =>
  ERROR_CODE_VALUES.includes(value);

/**
 * Turns a validation code (client resolver or 422 `field_errors`) into copy.
 * Codes without copy read as a generic invalid value.
 */
const useErrorText = () => {
  const t = useTranslations('Form.errors');

  return (code: string | undefined): string | undefined => {
    if (code === undefined) return undefined;
    return t(isErrorCode(code) ? code : 'invalid');
  };
};

export { isErrorCode, useErrorText, type ErrorCode };
