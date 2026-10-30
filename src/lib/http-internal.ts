import { APIVersion, AxiosAdapter } from '@lafise/lde-web-lib';

import { BASE_PATH } from '@/lib/constants/layout';

/** Browser client: goes through this zone's BFF proxy (`app/api/[...slug]`). */
const HttpInternal = new AxiosAdapter({
  baseURL: `${BASE_PATH}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'es',
    'x-channel-id': 'web',
  },
  apiVersion: APIVersion.V1,
});

export { HttpInternal };
