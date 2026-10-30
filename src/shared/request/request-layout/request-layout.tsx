import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { BrandHomeLink } from '@lafise/lde-web-core';
import { Header, HeaderItem } from '@lafise/onyx-ui/layout/header';

import { CloseRequestLink } from './close-request-link';
import { requestLayoutTheme } from './themes';

const { root, content, column, header, start, center, end, main } =
  requestLayoutTheme();

interface RequestLayoutProps {
  /** Centered header title; omit it for screens that only show logo and exit. */
  title?: ReactNode;
  /** Fixed left rail (form steps), shown from 1280px up. */
  rail?: ReactNode;
  /** Fixed bottom action bar; reserves room so content never hides behind it. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Chrome of every request screen: brand header (logo, title, close),
 * an optional fixed rail and an optional fixed footer. No sidebar, navbar or
 * profile. The close button leaves the zone, so it is a plain anchor, not
 * `next/link`.
 */
const RequestLayout = ({
  title,
  rail,
  footer,
  children,
}: Readonly<RequestLayoutProps>) => {
  const t = useTranslations('Request');
  const hasRail = rail !== undefined;

  return (
    <div className={root()}>
      {rail}

      <div className={content({ hasRail })}>
        <div className={column({ hasRail })}>
          <Header aria-label={t('headerLabel')} className={header()}>
            <HeaderItem justifyContent='start' className={start()}>
              <BrandHomeLink mark='group' size='sm' />
            </HeaderItem>

            {title === undefined ? null : (
              <HeaderItem justifyContent='center' className={center()}>
                {title}
              </HeaderItem>
            )}

            <HeaderItem justifyContent='end' className={end()}>
              <CloseRequestLink />
            </HeaderItem>
          </Header>
        </div>

        <main className={main({ hasRail, hasFooter: footer !== undefined })}>
          {children}
        </main>
      </div>

      {footer}
    </div>
  );
};

export { RequestLayout, type RequestLayoutProps };
