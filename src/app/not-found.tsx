'use client';

import { ErrorPageNotFound, HOME_MODULE_HREF } from '@lafise/lde-web-core';

import { ErrorPageLayout } from '@/shared/error/error-page-layout';

const NotFound = () => {
  return (
    <ErrorPageLayout>
      <ErrorPageNotFound homeHref={HOME_MODULE_HREF} />
    </ErrorPageLayout>
  );
};

export default NotFound;
