import { tv } from '@lafise/onyx-theme/tv';

const shareholdersBlockTheme = tv({
  slots: {
    list: 'flex flex-col gap-12',
    gate: 'text-medium-text',
    card: 'w-full',
    header: 'flex-row items-center justify-between pb-0 text-left',
    threshold: 'text-soft-text',
    body: 'flex flex-col gap-16 pt-32',
    notice: 'flex flex-col items-start gap-12',
    openActions: 'flex flex-wrap gap-8',
    rule: 'text-soft-text',
    actionRow: 'flex flex-wrap items-center justify-between gap-16',
    sealedHint: 'min-w-240 flex-1 text-soft-text',
    readiness: 'min-w-240 flex-1',
    action: 'shrink-0',
  },
  variants: {
    /** Nothing left to confirm: the readiness line reads as the main message. */
    ready: {
      true: { readiness: 'text-medium-text' },
      false: { readiness: 'text-soft-text' },
    },
  },
});

export { shareholdersBlockTheme };
