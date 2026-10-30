import type { DocumentChecklistItem } from '@/server/api';

/** Why a file cannot be uploaded to an item. */
type FileProblem = 'format' | 'size';

type ItemLimits = Pick<
  DocumentChecklistItem,
  'accepted_types' | 'max_size_bytes'
>;

/** MIME type of a PDF: it is drawn in the browser viewer instead of an `img`. */
const PDF_MIME = 'application/pdf';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MS_PER_SECOND = 1000;

/** HTTP statuses with which the server rejects a file for its format or size. */
const REJECTION_STATUSES = new Set([413, 415]);

/** Short names of the formats the checklist accepts; an unknown MIME type shows as is. */
const TYPE_LABELS = new Map([
  ['application/pdf', 'PDF'],
  ['image/jpeg', 'JPG'],
  ['image/png', 'PNG'],
]);

/** "PDF, JPG o PNG": the accepted formats as the copy names them, in the given locale. */
const acceptedTypesLabel = (types: readonly string[], locale: string): string =>
  new Intl.ListFormat(locale, { style: 'long', type: 'disjunction' }).format(
    types.map((type) => TYPE_LABELS.get(type) ?? type),
  );

/** Checks a file against the item's accepted types and size limit before it is sent. */
const validateFile = (
  file: Pick<File, 'size' | 'type'>,
  limits: ItemLimits,
): FileProblem | undefined => {
  if (file.size > limits.max_size_bytes) return 'size';
  return limits.accepted_types.includes(file.type) ? undefined : 'format';
};

/** Whole megabytes of the limit, as the copy states it. */
const megabytesOf = (bytes: number): number => Math.round(bytes / BYTES_PER_MB);

/** Human size: bytes, whole kilobytes (never "0 KB" for a small file) or megabytes with one decimal. */
const formatBytes = (bytes: number): string => {
  if (bytes < BYTES_PER_KB) return `${String(bytes)} B`;
  if (bytes < BYTES_PER_MB)
    return `${String(Math.round(bytes / BYTES_PER_KB))} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
};

/**
 * Seconds left, extrapolated from the real rate so far. `undefined` until
 * something was sent, because without a rate there is nothing to estimate.
 */
const remainingSeconds = (
  elapsedMs: number,
  fraction: number,
): number | undefined =>
  fraction <= 0 ? undefined : (
    Math.round((elapsedMs * (1 - fraction)) / fraction / MS_PER_SECOND)
  );

/** Whether the server refused the file for its format or size (`415` / `413`). */
const isRejection = (status: number): boolean => REJECTION_STATUSES.has(status);

export {
  acceptedTypesLabel,
  formatBytes,
  isRejection,
  megabytesOf,
  PDF_MIME,
  remainingSeconds,
  validateFile,
  type FileProblem,
  type ItemLimits,
};
