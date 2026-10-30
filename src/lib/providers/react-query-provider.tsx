'use client';

import { useState } from 'react';

import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { createQueryClient } from '@lafise/lde-web-lib';

import { shouldRouteQueryErrorToPage } from '@/lib/http/error-router';

interface ReactQueryProviderProps {
  children: ReactNode;
  /**
   * Cross-cutting handler dispatched by `createQueryClient` once per
   * settled `HttpException(401)` from any query or mutation.
   *
   * Wired from the root Server Component to a Server Action returned by
   * `createLogoutServerActions()` (see `@/lib/actions/logout`). That
   * action purges the `access_token` from the `auth_session` cookie
   * server-side and redirects to the shared `DEFAULT_LOGIN_PATH`
   * (`/auth/login`), so downstream SSR requests never re-attach the
   * stale token — the risk that a pure client-side `router.replace`
   * would leave open.
   *
   * The `firing` closure below single-flights the callback per
   * `QueryClient` instance so N parallel 401s only trigger one
   * redirect / cookie purge round-trip.
   */
  onUnauthorized: () => void | Promise<void>;
}

const ReactQueryProvider = ({
  children,
  onUnauthorized,
}: Readonly<ReactQueryProviderProps>) => {
  const [client] = useState(() => {
    let firing = false;
    const client = createQueryClient({
      onUnauthorized: () => {
        if (firing) return;
        firing = true;
        // Fire-and-forget: the server action owns its own error
        // surface (redirect + cookie purge). Swallow rejections here
        // so a failing handler cannot become an unhandled promise
        // rejection in the client.
        Promise.resolve(onUnauthorized()).catch(() => undefined);
      },
    });
    const defaults = client.getDefaultOptions();
    client.setDefaultOptions({
      ...defaults,
      queries: {
        ...defaults.queries,
        throwOnError: shouldRouteQueryErrorToPage,
      },
    });
    return client;
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

export { ReactQueryProvider, type ReactQueryProviderProps };
