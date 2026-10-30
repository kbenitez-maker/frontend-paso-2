import { tv } from '@lafise/onyx-theme/tv';

const bankDocumentsBlockTheme = tv({
  slots: {
    card: 'mt-32 w-full',
    header: 'gap-y-12 pb-12',
    headline: 'max-w-560 gap-8',
    description: 'text-medium-text',
    body: 'flex flex-col gap-16',
    empty: 'gap-24 py-8',
    milestones: 'w-full max-w-sm',
  },
});

export { bankDocumentsBlockTheme };
