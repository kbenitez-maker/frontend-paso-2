import { APIVersion, AxiosAdapter } from '@lafise/lde-web-lib';

import { env } from '@/lib/env';

/** Server-side client: talks to the backend directly (no BFF hop). */
const Http = new AxiosAdapter({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': env.NEXT_PUBLIC_X_API_KEY,
    'Accept-Language': 'es',
    'x-channel-id': 'web',
  },
  apiVersion: APIVersion.V1,
});

export { Http };
