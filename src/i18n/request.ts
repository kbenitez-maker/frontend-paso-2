import { cookies } from 'next/headers';

import { getRequestConfig } from 'next-intl/server';

import { resolveMessages } from '@/i18n/messages';
import { i18nFormats } from '@/lib/i18n';
import { SupportedLocales } from '@/types/i18n';

const resolveLocale = (raw: string | undefined): SupportedLocales =>
  raw === SupportedLocales.En ? SupportedLocales.En : SupportedLocales.Es;

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get('locale')?.value);

  return {
    locale,
    formats: i18nFormats,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    messages: resolveMessages(locale),
  };
});
