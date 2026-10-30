import { tv } from '@lafise/onyx-theme/tv';

const stepRailTheme = tv({
  slots: {
    /** Hidden below 1280px; stops above the 72px footer. */
    nav: `
      fixed top-0 bottom-72 left-0 z-10 hidden w-325 flex-col gap-8
      overflow-y-auto bg-base-surface p-32
      min-[1280px]:flex
    `,
    steps: 'flex flex-col gap-4',
    header: 'flex items-center gap-8',
    avatar: 'bg-base-primary-brand',
    /** POC parity: the flag is 20px in total (Onyx md puts its 2px border outside the box: 16 + 2 + 2). */
    flag: 'size-16',
    identity: 'flex min-w-0 flex-col gap-4',
    heading: 'font-semibold text-base-text',
    countryLabel: 'truncate text-medium-text',
    progressRow: 'flex items-center gap-12',
    progressBar: 'flex-1',
    percentLabel: 'font-semibold text-base-text tabular-nums',
    stepRow: `
      flex min-h-56 items-center rounded-8 transition-colors
      hover:bg-light-surface
    `,
    stepLink: 'flex min-w-0 flex-1 items-center gap-12 py-8 pl-8',
    badge: `
      flex size-28 shrink-0 items-center justify-center rounded-full
      text-label-xs font-semibold
    `,
    badgeCheck: 'size-14',
    /** Title plus status (steps) or counter (blocks). */
    text: 'flex min-w-0 flex-1 flex-col gap-2',
    title: 'font-semibold',
    toggle: 'mr-8 shrink-0',
    chevron: `
      transition-transform duration-200
      motion-reduce:transition-none
    `,
    /** POC parity: spacing of the Onyx `ListBox` (8 between items, 60px rows). */
    blockList: 'mt-2 ml-48 flex flex-col gap-8 pb-8',
    /** `gap-4`: with the check and a scrollbar, "Información requerida" needs every pixel to stay on one line. */
    blockLink: `
      flex min-h-60 items-center gap-4 rounded-8 px-12 py-8 transition-colors
      hover:bg-light-surface
    `,
    blockText: 'flex min-w-0 flex-1 flex-col justify-center gap-4',
    /** POC parity: `ListBox.Label` fills each line; Onyx `Text` balances them. */
    blockTitle: 'font-semibold text-wrap',
    blockCounter: 'text-wrap text-medium-text',
    /** POC parity: the check goes last so titles keep one left edge. */
    blockCheck: 'size-20 shrink-0 text-base-success',
    waitingRow:
      'flex min-h-60 flex-col justify-center gap-4 rounded-8 px-12 py-8',
    waitingTitle: 'font-semibold text-wrap text-soft-text',
    waitingNote: 'text-wrap text-soft-text',
    hintTrigger: 'block w-full',
    waitingHint: 'max-w-240',
  },
  variants: {
    state: {
      complete: { badge: 'bg-lightest-success text-base-success' },
      in_progress: {
        badge: 'bg-lightest-primary-brand text-dark-primary-brand',
      },
      not_started: { badge: 'bg-light-surface text-soft-text' },
    },
    current: {
      true: {
        title: 'text-base-text',
        blockTitle: 'text-base-text',
        blockLink: 'bg-lightest-primary-brand',
      },
      false: { title: 'text-medium-text', blockTitle: 'text-medium-text' },
    },
    open: {
      true: { chevron: 'rotate-180' },
    },
  },
});

export { stepRailTheme };
