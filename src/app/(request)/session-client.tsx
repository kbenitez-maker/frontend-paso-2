'use client';

import { useMemo } from 'react';

import type { SessionExpiry } from '@lafise/lde-web-core';
import type { ReactNode } from 'react';

import { LdeAppShellInactivityMonitor } from '@lafise/lde-web-auth';
import { LdeAppShellProvider } from '@lafise/lde-web-core';
import { APIVersion } from '@lafise/lde-web-lib';

import { BASE_PATH } from '@/lib/constants/layout';
import { queryAdapter } from '@/lib/query';
import { PermissionGuard } from '@/shared/auth/permission-guard';

interface SessionClientProps {
  children: ReactNode;
  getUserIdAction: () => Promise<string | undefined>;
  clearSessionAction: (userName?: string) => Promise<never>;
  getSessionExpiryAction: () => Promise<SessionExpiry | null>;
  refreshSessionAction: () => Promise<SessionExpiry>;
}

/**
 * Session safety without any shell chrome: permission guard, silent JWT
 * refresh (`config.refresh`) and the inactivity monitor (logout countdown).
 * Server actions are RPC handles from the parent layout — do not re-export
 * them from `'use server'`.
 */
const SessionClient = ({
  children,
  getUserIdAction,
  clearSessionAction,
  getSessionExpiryAction: getSessionExpiry,
  refreshSessionAction: refreshSession,
}: SessionClientProps) => {
  const config = useMemo(
    () => ({
      queryAdapter,
      apiVersion: APIVersion.V1,
      basePath: BASE_PATH,
      logout: {
        getUserId: getUserIdAction,
        clearSession: clearSessionAction,
      },
      refresh: {
        getSessionExpiry,
        refreshSession,
      },
    }),
    [getUserIdAction, clearSessionAction, getSessionExpiry, refreshSession],
  );

  return (
    <PermissionGuard>
      <LdeAppShellProvider config={config}>
        <LdeAppShellInactivityMonitor countdownDirection='down' />
        {children}
      </LdeAppShellProvider>
    </PermissionGuard>
  );
};

export { SessionClient };
