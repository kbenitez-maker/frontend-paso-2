import { tv } from '@lafise/onyx-theme/tv';

const countryBadgeTheme = tv({
  slots: {
    root: `
      flex items-center gap-8 self-center rounded-full bg-light-surface px-12
      py-6
    `,
    countryName: 'font-semibold text-base-text',
    bankCode: 'text-soft-text',
  },
});

export { countryBadgeTheme };
