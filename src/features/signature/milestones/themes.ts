import { tv } from '@lafise/onyx-theme/tv';

const milestonesTheme = tv({
  slots: {
    badge: `
      flex size-40 shrink-0 items-center justify-center rounded-full
      bg-lightest-primary-brand
    `,
    number: 'font-semibold text-base-primary-brand',
  },
});

export { milestonesTheme };
