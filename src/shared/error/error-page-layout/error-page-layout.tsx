'use client';

import type { ReactNode } from 'react';

import { BrandHomeLink } from '@lafise/lde-web-core';

import { errorPageLayoutTheme } from './themes';

const { root, header, body } = errorPageLayoutTheme();

interface ErrorPageLayoutProps {
  children: ReactNode;
}

const ErrorPageLayout = ({ children }: ErrorPageLayoutProps) => {
  return (
    <dialog aria-modal='true' className={root()}>
      <header className={header()}>
        <BrandHomeLink mark='group' size='sm' variant='primary' />
      </header>
      <div className={body()}>{children}</div>
    </dialog>
  );
};

export { ErrorPageLayout, type ErrorPageLayoutProps };
