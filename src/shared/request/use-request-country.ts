'use client';

import { useQuery } from '@tanstack/react-query';

import { accountRequestQuery } from '@/server/api';

/**
 * Country of the request. `undefined` while it loads and when the legacy
 * detail is missing: a missing country must not invent a route.
 */
const useRequestCountry = (requestId: string) => {
  const { data } = useQuery({
    ...accountRequestQuery(requestId),
    throwOnError: false,
  });

  return data?.profile?.country;
};

export { useRequestCountry };
