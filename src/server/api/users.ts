import type { UserMe } from '@/types/user';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

const userMeQuery = () =>
  queryAdapter.query<UserMe>({
    queryKey: queryKeys.users.me(),
    url: endpoints.users.me(),
    options: { apiVersion: APIVersion.V1 },
  });

export { userMeQuery };
