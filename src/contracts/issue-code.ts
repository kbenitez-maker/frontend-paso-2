/** Minimal view of a Zod issue: enough to name it, whether raw or final. */
interface IssueLike {
  code: string;
  message?: string | undefined;
  format?: string | undefined;
}

/** Formats the form has copy for; any other format reads as a generic invalid value. */
const NAMED_FORMATS = new Set(['email', 'url']);

/**
 * Stable machine code of a validation issue. Our own refinements (`required`,
 * `min`, `not_future`, ...) carry it as the message; built-in Zod failures map
 * to `email`, `url` or `invalid`. A client-side error and a 422 field error
 * speak the same codes.
 */
const issueCode = (issue: IssueLike): string => {
  if (issue.code === 'custom') return issue.message ?? 'invalid';
  if (
    issue.code === 'invalid_format' &&
    issue.format !== undefined &&
    NAMED_FORMATS.has(issue.format)
  ) {
    return issue.format;
  }
  return 'invalid';
};

/**
 * Codes of answers still missing (an empty required field, a collection below
 * its minimum): fine in a draft, blocking only when a section is completed.
 */
const MISSING_CODES = new Set([
  'required',
  'min_items',
  // `message_key` of the overlay's `any_true` and `min_items_when_any` rules.
  'no_feature_enabled',
  'joint_signers',
  // `sole_item_not` (POC comiteEnBloque): the list is kept, the section does not close.
  'committee_as_one',
  // A person picked from the request's people who is no longer there: kept in a draft, blocks completion.
  'person_unlisted',
  'signer_unlisted',
  'superuser_unlisted',
]);

const isMissingCode = (code: string): boolean => MISSING_CODES.has(code);

export { isMissingCode, issueCode, type IssueLike };
