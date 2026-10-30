'use client';

import { useEffect } from 'react';

import {
  ErrorPageForbidden,
  ErrorPageInternal,
  ErrorPageNotFound,
  HOME_MODULE_HREF,
} from '@lafise/lde-web-core';

import { clearSessionAction } from '@/lib/actions/logout';
import { classifyBackendError } from '@/lib/http/error-router';
import { BackendErrorKind } from '@/lib/http/types';
import { ErrorPageLayout } from '@/shared/error/error-page-layout';

interface ClassifiedErrorPageProps {
  error: unknown;
}

const ClassifiedErrorPage = ({ error }: Readonly<ClassifiedErrorPageProps>) => {
  const classified = classifyBackendError(error);

  useEffect(() => {
    if (classified.kind === BackendErrorKind.Unauthorized) {
      void clearSessionAction();
    }
  }, [classified.kind]);

  if (classified.kind === BackendErrorKind.Forbidden) {
    return (
      <ErrorPageLayout>
        <ErrorPageForbidden homeHref={HOME_MODULE_HREF} />
      </ErrorPageLayout>
    );
  }

  if (classified.kind === BackendErrorKind.NotFound) {
    return (
      <ErrorPageLayout>
        <ErrorPageNotFound homeHref={HOME_MODULE_HREF} />
      </ErrorPageLayout>
    );
  }

  return (
    <ErrorPageLayout>
      <ErrorPageInternal />
    </ErrorPageLayout>
  );
};

export { ClassifiedErrorPage, type ClassifiedErrorPageProps };
