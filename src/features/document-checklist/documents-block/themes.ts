import { tv } from '@lafise/onyx-theme/tv';

const documentsBlockTheme = tv({
  slots: {
    card: 'w-full',
    header: 'pb-12',
    headline: 'gap-4',
    description: 'text-medium-text',
    body: 'flex flex-col gap-24',
  },
});

export { documentsBlockTheme };
