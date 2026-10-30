import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { resolveMessages } from '@/i18n/messages';
import { i18nFormats } from '@/lib/i18n';
import { SupportedLocales } from '@/types/i18n';

interface NextIntlClientTestWrapperProps {
  locale?: SupportedLocales;
  children: ReactNode;
}

const NextIntlClientTestWrapper = ({
  locale = SupportedLocales.Es,
  children,
}: Readonly<NextIntlClientTestWrapperProps>) => (
  <NextIntlClientProvider
    locale={locale}
    messages={resolveMessages(locale)}
    timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
    formats={i18nFormats}
  >
    {children}
  </NextIntlClientProvider>
);

export { NextIntlClientTestWrapper, type NextIntlClientTestWrapperProps };
