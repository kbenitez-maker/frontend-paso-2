'use client';

import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';

import { hasAccountRequestAccess } from '@/lib/auth/account-request-module-access';
import { userMeQuery } from '@/server/api';
import { ClassifiedErrorPage } from '@/shared/error/classified-error-page';
import { ForbiddenPage } from '@/shared/error/forbidden-page';

interface PermissionGuardProps {
  children: ReactNode;
}

/**
 * Client route guard for the zone. Loads `users/me` (deduped with the session
 * provider through the shared query key) and renders the full-screen forbidden
 * page on fetch failure or when the account-request module is inactive.
 */
const PermissionGuard = ({ children }: Readonly<PermissionGuardProps>) => {
  const { data, error, isPending } = useQuery({
    ...userMeQuery(),
    staleTime: Number.POSITIVE_INFINITY,
    throwOnError: false,
  });

  if (isPending) {
    return null;
  }

  if (error) {
    return <ClassifiedErrorPage error={error} />;
  }

  if (hasAccountRequestAccess(data)) {
    return children;
  }

  return <ForbiddenPage />;
};

export { PermissionGuard, type PermissionGuardProps };
