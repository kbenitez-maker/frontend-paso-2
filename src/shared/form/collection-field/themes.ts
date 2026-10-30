import { tv } from '@lafise/onyx-theme/tv';

const collectionFieldTheme = tv({
  slots: {
    root: 'col-span-2 flex flex-col gap-12',
    header: 'flex items-baseline justify-between gap-12',
    label: 'font-semibold text-base-text',
    /** Secondary copy: the count, the empty state and the maximum notice. */
    note: 'text-soft-text',
    empty: `
      rounded-12 border border-dashed border-medium-stroke p-24 text-center
    `,
    description: '',
    add: 'flex items-center gap-12',
  },
  variants: {
    /** An item left incomplete: its first problem replaces the summary. */
    invalid: {
      true: { description: 'text-base-error' },
    },
  },
});

export { collectionFieldTheme };
