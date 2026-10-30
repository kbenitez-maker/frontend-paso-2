import { tv } from '@lafise/onyx-theme/tv';

const ownershipTreeTheme = tv({
  slots: {
    root: 'flex w-full flex-col gap-8',
    holder: `
      flex w-full flex-col gap-8 rounded-8 border border-medium-stroke p-12
    `,
    holderHead: 'flex items-center gap-8',
    // POC: the icon keeps the inherited text color (its `text-base-primary` is not a theme token).
    figure: `
      flex size-44 shrink-0 items-center justify-center rounded-full
      bg-base-surface
    `,
    labels: 'flex min-w-0 flex-1 flex-col gap-4',
    heading: 'truncate font-semibold text-base-text',
    holderHint: 'text-medium-text',
    addLevelOne: 'shrink-0',
    over: 'text-base-error tabular-nums',
    item: 'flex items-center gap-10',
    // POC: a square bar (its `rounded-l-24` is not a theme token, so it renders unrounded).
    divider: 'h-44 w-3 shrink-0 bg-light-stroke',
    rowWrap: 'flex min-w-0 flex-1 flex-col',
    row: `
      flex min-h-60 w-full items-center gap-8 rounded-8 bg-light-surface px-12
      py-8
    `,
    detail: '',
    hidden: 'text-soft-text',
    actions: 'flex shrink-0 items-center gap-8',
    stack: `
      mx-12 h-6 rounded-b-8 border-x border-b border-light-stroke
      bg-light-surface
    `,
  },
  variants: {
    /** A row left incomplete: its first problem replaces the detail. */
    problem: {
      true: { detail: 'text-base-error' },
      false: { detail: 'text-medium-text' },
    },
  },
});

const splitBarTheme = tv({
  slots: {
    root: 'flex flex-col gap-8',
    track: 'flex w-full items-stretch gap-4',
    segment: 'h-8',
    legend: 'flex flex-wrap gap-8',
    legendItem: 'flex min-w-96 flex-col gap-2',
    legendHead: 'flex items-center gap-8',
    dot: 'size-10 shrink-0 rounded-full',
    percentage: 'font-bold text-base-text tabular-nums',
    label: 'truncate text-soft-text',
  },
  variants: {
    tint: {
      dark: {
        segment: 'bg-dark-primary-brand',
        dot: 'bg-dark-primary-brand',
      },
      base: {
        segment: 'bg-base-primary-brand',
        dot: 'bg-base-primary-brand',
      },
      light: {
        segment: 'bg-light-primary-brand',
        dot: 'bg-light-primary-brand',
      },
      unassigned: { segment: 'bg-medium-surface', dot: 'bg-medium-surface' },
    },
  },
});

const actionTheme = tv({
  slots: { tooltip: 'max-w-240' },
});

export { actionTheme, ownershipTreeTheme, splitBarTheme };
