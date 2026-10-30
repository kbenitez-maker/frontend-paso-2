import { tv } from '@lafise/onyx-theme/tv';

const baseDocumentsStepTheme = tv({
  slots: {
    card: 'w-full max-w-1216',
    header: 'pb-12',
    headline: 'gap-4',
    description: 'text-medium-text',
    body: 'flex flex-col gap-16',
  },
});

export { baseDocumentsStepTheme };
