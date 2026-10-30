import { tv } from '@lafise/onyx-theme/tv';

const fieldRendererTheme = tv({
  base: 'flex flex-col gap-4',
  variants: {
    /** Paragraphs and yes/no questions take the whole row of the two-column grid. */
    fullWidth: {
      true: 'col-span-2',
    },
  },
});

export { fieldRendererTheme };
