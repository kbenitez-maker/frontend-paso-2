import { tv } from '@lafise/onyx-theme/tv';

const sectionCardTheme = tv({
  slots: {
    card: 'w-full',
    header: 'flex-row items-center justify-between pb-0 text-left',
    headline: 'items-start gap-4 text-left',
    marker: 'shrink-0 text-soft-text',
    /** Two 318px columns with a 12px gap and 16px between rows, as in the design's data container. */
    body: 'grid grid-cols-2 items-start gap-x-12 gap-y-16 pt-32',
  },
});

export { sectionCardTheme };
