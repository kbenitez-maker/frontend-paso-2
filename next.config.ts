import type { NextConfig } from 'next';

import createNextIntlPlugin from 'next-intl/plugin';

import { BASE_PATH } from './src/lib/constants/layout';
import { routes } from './src/lib/routes';

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//.test(value);

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // `next dev` would otherwise rewrite AGENTS.md on every run.
  agentRules: false,
  transpilePackages: [
    '@lafise/onyx-env',
    '@lafise/lde-web-env',
    '@lafise/lde-web-core',
    '@lafise/lde-web-lib',
    '@lafise/lde-web-auth',
    '@lafise/lde-web-translations',
  ],
  basePath: BASE_PATH,
  output: 'standalone',
  // The request list lives in the home zone. `redirect()` in a page would
  // prepend the basePath, so the cross-zone hop is a config redirect with
  // `basePath: false`.
  redirects: () => [
    {
      source: BASE_PATH,
      destination: routes.external.requests(),
      basePath: false,
      permanent: false,
    },
    // Local only (absolute NEXT_PUBLIC_HOME_URL): lde-web-core links (brand
    // logo, error pages) hardcode '/home', which behind the portal belongs to
    // the home zone. Without the portal, send it to the local home zone.
    ...(isAbsoluteUrl(routes.external.home()) ?
      [
        {
          source: '/home/:path*',
          destination: routes.external.home(),
          basePath: false as const,
          permanent: false,
        },
      ]
    : []),
  ],
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
