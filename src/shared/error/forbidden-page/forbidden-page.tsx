'use client';

import { ErrorPageForbidden, HOME_MODULE_HREF } from '@lafise/lde-web-core';

import { ErrorPageLayout } from '@/shared/error/error-page-layout';

const ForbiddenPage = () => {
  return (
    <ErrorPageLayout>
      <ErrorPageForbidden homeHref={HOME_MODULE_HREF} />
    </ErrorPageLayout>
  );
};

export { ForbiddenPage };
