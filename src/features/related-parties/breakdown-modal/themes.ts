import { tv } from '@lafise/onyx-theme/tv';

const breakdownModalTheme = tv({
  slots: {
    // eslint-disable-next-line better-tailwindcss/enforce-canonical-classes -- `w-sm` is the 24rem container, not 640px
    dialog: 'w-640',
    headerSlot: 'flex flex-col gap-12',
    headline: 'flex flex-col gap-8 text-left',
    description: 'text-medium-text',
    body: 'flex flex-col gap-24',
    route: 'flex flex-col gap-8',
    routeTitle: 'font-semibold text-medium-text',
    total: 'font-semibold text-base-text',
  },
});

const routeTableTheme = tv({
  slots: {
    root: 'flex flex-col gap-12',
    level: 'text-soft-text tabular-nums',
    who: 'flex flex-col gap-2',
    name: '',
    of: 'text-soft-text',
    part: 'tabular-nums',
    accumulated: 'tabular-nums',
    sum: 'rounded-12 bg-light-surface px-16 py-12',
    sumText: 'text-medium-text',
  },
  variants: {
    /** The last link of the route: the holder's own part. */
    last: {
      true: {
        name: 'font-semibold',
        accumulated: 'font-semibold text-base-text',
      },
      false: { accumulated: 'text-soft-text' },
    },
  },
});

export { breakdownModalTheme, routeTableTheme };
