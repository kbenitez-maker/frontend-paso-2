import type { AppMessages } from '@/i18n/messages';
import type { SupportedLocales } from '@/types/i18n';
import type { i18nFormats } from './src/lib/i18n';

declare module 'next-intl' {
  interface AppConfig {
    Locale: SupportedLocales;
    Messages: AppMessages;
    Formats: typeof i18nFormats;
  }
}
