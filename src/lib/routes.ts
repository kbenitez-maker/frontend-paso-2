import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { BankId, Route } from '@/types/domain';

import { env } from './env';

interface StepOptions<S extends StepSlug> {
  block?: BlockOf<S>;
  /** Local preview only. Kept on step links so the next section stays on the same request. */
  bank?: string | undefined;
}

/** Home zone path behind the portal; `NEXT_PUBLIC_HOME_URL` overrides it locally. */
const DEFAULT_HOME_URL = '/home';

/**
 * Only place that builds hrefs. Internal routes omit the basePath (Next adds
 * it); `external` targets live in other zones, so they are plain host paths.
 */
const routes = {
  /** The bank (country) is chosen before `/new` and travels as `?bank=`; it cannot change there. */
  new: (bankId: BankId): Route => `/new?bank=${bankId}`,
  request: (requestId: string): Route => `/${requestId}`,
  profile: (requestId: string): Route => `/${requestId}/profile`,
  baseDocuments: (requestId: string): Route => `/${requestId}/base-documents`,
  step: <S extends StepSlug>(
    requestId: string,
    slug: S,
    { block, bank }: StepOptions<S> = {},
  ): Route => {
    const path: Route = `/${requestId}/${slug}`;
    const params = new URLSearchParams();
    if (block) params.set('block', block);
    if (bank) params.set('bank', bank);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  },
  survey: (requestId: string): Route => `/${requestId}/survey`,
  /** `rated` thanks the applicant for answering the survey (POC encuesta). */
  submitted: (requestId: string, { rated = false } = {}): Route =>
    rated ? `/${requestId}/submitted?rated=1` : `/${requestId}/submitted`,
  external: {
    /** Cross-zone: navigate with a full page load, never `next/link`. */
    home: (): string => env.NEXT_PUBLIC_HOME_URL ?? DEFAULT_HOME_URL,
    /** The requests list, owned by the home zone. */
    requests: (): string =>
      `${env.NEXT_PUBLIC_HOME_URL ?? DEFAULT_HOME_URL}/account-requests`,
    login: (): Route => '/auth/login',
  },
} as const;

export { routes };
