import { tv } from '@lafise/onyx-theme/tv';

const beneficiariesTableTheme = tv({
  slots: {
    root: 'flex flex-col gap-12',
    person: 'flex flex-col items-start gap-4',
    name: 'font-semibold',
    appearances: 'text-soft-text',
    level: 'tabular-nums',
    total: 'tabular-nums',
    direct: 'text-soft-text',
  },
  variants: {
    /** Reaches the participation threshold: its total is emphasized. */
    beneficial: {
      true: { total: 'font-semibold' },
      false: { total: 'text-medium-text' },
    },
  },
});

export { beneficiariesTableTheme };
