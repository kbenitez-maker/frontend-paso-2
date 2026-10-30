import type { ReactNode } from 'react';

import { clearSessionAction, getUserIdAction } from '@/lib/actions/logout';
import {
  getSessionExpiryAction,
  refreshSessionAction,
} from '@/lib/actions/refresh';

import { SessionClient } from './session-client';

interface RequestGroupLayoutProps {
  children: ReactNode;
}

/**
 * Request group layout (Server Component). Hands the bound logout/refresh
 * Server Actions to `<SessionClient>`, which mounts the account-request module
 * guard, silent refresh and the inactivity monitor. It renders no sidebar,
 * navbar or profile: the request chrome lives in `RequestLayout`.
 */
const RequestGroupLayout = ({
  children,
}: Readonly<RequestGroupLayoutProps>) => (
  <SessionClient
    getUserIdAction={getUserIdAction}
    clearSessionAction={clearSessionAction}
    getSessionExpiryAction={getSessionExpiryAction}
    refreshSessionAction={refreshSessionAction}
  >
    {children}
  </SessionClient>
);

export default RequestGroupLayout;
