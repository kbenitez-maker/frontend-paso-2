import { logger } from '@/lib/logger';

const REQUEST_ID =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

interface OpeningUpstreamInput {
  slug: string[];
  /** Bank from the `fcj-form-bank` cookie. */
  bank: string | undefined;
  /** Optional second upstream. Only used for local GET previews. */
  formApi: string | undefined;
  /** JSON map of bank code to request id. Only used for local GET previews. */
  formRequests: string | undefined;
  /** Request id used when the bank is not in the map. */
  formRequestId: string | undefined;
  defaultApiBase: string | undefined;
  /** Local GET preview. Production and writes stay on the default API. */
  localPreview: boolean;
}

interface OpeningUpstream {
  slug: string[];
  /** Original path. The 404 retry must not reuse the rewritten request id. */
  fallbackSlug: string[];
  apiBase: string | undefined;
  /** Default API retried on 404 for catalog and step-answer reads in a local preview. */
  fallbackBase: string | undefined;
}

const withoutTrailingSlash = (value: string | undefined): string =>
  (value ?? '').trim().replace(/\/$/, '');

/** Request id mapped to a `?bank=` preview, or `undefined` when unset or unknown. */
const requestIdForBank = (
  bank: string | undefined,
  raw: string | undefined,
): string | undefined => {
  const trimmed = raw?.trim();
  if (!bank || !trimmed) return undefined;
  const map = requestMap(trimmed);
  if (map === undefined) return undefined;
  const match = Object.entries(map).find(
    ([key]) => key.toUpperCase() === bank.toUpperCase(),
  );
  const value = match?.[1];
  return typeof value === 'string' && value.trim().length > 0 ?
      value.trim()
    : undefined;
};

const requestMap = (raw: string): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return Object.fromEntries(Object.entries(parsed));
    }
  } catch {
    // Logged below: a bad map must not silently show another country's request.
  }
  logger.warn('FCJ_FORM_REQUESTS is not a { bank: requestId } map');
  return undefined;
};

/** Replaces only the request id, the segment after `account-opening-requests`. */
const rewriteOpeningRequestId = (
  slug: string[],
  formRequestId: string | undefined,
): string[] => {
  if (formRequestId === undefined) return slug;
  const at = slug.indexOf('account-opening-requests');
  if (at < 0) return slug;
  return slug.map((part, index) =>
    index === at + 1 && REQUEST_ID.test(part) ? formRequestId : part,
  );
};

/**
 * Upstream for the opening-request form. With no `FCJ_*` values the portal
 * keeps a single API base. A local bank preview rewrites the request id.
 * Catalogs and the step answer fall back to the default base on 404; sections
 * stay on the form API.
 */
const openingUpstream = ({
  slug,
  bank,
  formApi,
  formRequests,
  formRequestId,
  defaultApiBase,
  localPreview,
}: OpeningUpstreamInput): OpeningUpstream => {
  const path = slug.join('/');
  const isCatalog = path.includes('/catalogs/');
  const isStepAnswer = /\/steps\/[^/]+\/answer$/u.test(path);
  const readsForm = path.includes('account-opening-requests/') || isCatalog;
  const resolvedId =
    localPreview ?
      (requestIdForBank(bank, formRequests) ?? formRequestId?.trim())
    : undefined;
  const trimmedFormApi = formApi?.trim();
  const formBase = withoutTrailingSlash(trimmedFormApi);
  const defaultBase = withoutTrailingSlash(defaultApiBase);
  const usesFormApi = localPreview && readsForm && formBase.length > 0;
  const canFallBack =
    localPreview &&
    (isCatalog || isStepAnswer) &&
    formBase.length > 0 &&
    formBase !== defaultBase;

  const previewId = resolvedId === '' ? undefined : resolvedId;

  return {
    slug: readsForm ? rewriteOpeningRequestId(slug, previewId) : slug,
    fallbackSlug: slug,
    apiBase: usesFormApi ? trimmedFormApi : defaultApiBase,
    fallbackBase: canFallBack ? defaultApiBase : undefined,
  };
};

export { openingUpstream, type OpeningUpstream };
