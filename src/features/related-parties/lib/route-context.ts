'use client';

import { createContext } from 'react';

import type { RelatedPartyMatrix } from '@/server/api';

/** Matrix entry of the request's company, for the custom blocks of the step. */
const RouteContext = createContext<RelatedPartyMatrix | undefined>(undefined);

/** Request and participation threshold of the ownership structure (route A shareholders). */
const OwnershipContext = createContext<
  { requestId: string; threshold: number } | undefined
>(undefined);

export { OwnershipContext, RouteContext };
