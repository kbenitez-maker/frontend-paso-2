import { Open_Sans } from 'next/font/google';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { NetworkBoundary } from '@lafise/lde-web-core';
import { ToastProvider } from '@lafise/onyx-ui';

import { clearSessionAction } from '@/lib/actions/logout';
import { i18nFormats } from '@/lib/i18n';
import { ReactQueryProvider } from '@/lib/providers/react-query-provider';
import { ThemeProvider } from '@/lib/providers/theme-provider';

import '@/styles/index.css';

import { rootBodyTheme } from './themes';

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
});

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('App');

  return {
    title: {
      template: `%s | ${t('shortName')}`,
      default: t('shortName'),
    },
    description: t('description'),
    applicationName: t('name'),
    authors: {
      name: 'LAFISE Digital Team',
    },
    keywords: ['lafise', 'lafise-digital'],
  };
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta
          name='apple-mobile-web-app-title'
          content='LAFISE Digital Empresas'
        />
      </head>
      <body className={rootBodyTheme({ class: openSans.variable })}>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          formats={i18nFormats}
        >
          <ThemeProvider>
            <NuqsAdapter>
              {/*
                `onUnauthorized` fires once per settled 401 from the shared
                React Query client; the Server Action purges the session
                cookie server-side and redirects to the portal login.
               */}
              <ReactQueryProvider onUnauthorized={clearSessionAction}>
                <NetworkBoundary>{children}</NetworkBoundary>
              </ReactQueryProvider>
            </NuqsAdapter>
          </ThemeProvider>
          <ToastProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
