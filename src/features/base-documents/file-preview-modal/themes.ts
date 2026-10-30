import { tv } from '@lafise/onyx-theme/tv';

const filePreviewModalTheme = tv({
  slots: {
    dialog: 'w-840 max-w-full',
    /** A row, not the default stack: the close button belongs at the far end, beside the title. */
    header: 'flex-row items-center justify-between',
    error: 'flex flex-col items-start gap-12',
    loading: 'text-soft-text',
    pdf: 'h-600 w-full rounded-12',
    image: 'mx-auto size-auto max-h-600 rounded-12',
  },
});

export { filePreviewModalTheme };
