import type { DateTimeFormatOptions, Formats } from 'next-intl';

const SHARED_DATE_TIME_FORMAT = {
  timeStyle: 'short',
  hour12: true,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
} satisfies DateTimeFormatOptions;

export const i18nFormats = {
  dateTime: {
    short: {
      dateStyle: 'short',
      ...SHARED_DATE_TIME_FORMAT,
    },
    medium: {
      dateStyle: 'medium',
      ...SHARED_DATE_TIME_FORMAT,
    },
    long: {
      dateStyle: 'long',
      ...SHARED_DATE_TIME_FORMAT,
    },
    full: {
      dateStyle: 'full',
      ...SHARED_DATE_TIME_FORMAT,
    },
  },
  number: {
    currency: {
      style: 'currency',
      currencyDisplay: 'code',
    },
  },
} satisfies Formats;
