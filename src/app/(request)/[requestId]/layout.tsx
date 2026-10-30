import { notFound } from 'next/navigation';

import type { ReactNode } from 'react';

import { isRequestId } from '@/lib/request-id';

interface RequestLayoutProps {
  children: ReactNode;
  params: Promise<{ requestId: string }>;
}

/**
 * Validates the `requestId` param. Opening-request drafts are loaded by
 * the company step (`GET account-opening-requests/{id}/sections`); the
 * legacy `account-requests/{id}` detail is not a gate here.
 */
const RequestLayout = async ({
  children,
  params,
}: Readonly<RequestLayoutProps>) => {
  const { requestId } = await params;
  if (!isRequestId(requestId)) notFound();

  return children;
};

export default RequestLayout;
