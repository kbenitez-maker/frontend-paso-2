import { tv } from '@lafise/onyx-theme/tv';

const confirmBlockTheme = tv({
  slots: {
    card: 'w-full',
    header: 'pb-12',
    headline: 'gap-4',
    description: 'text-medium-text',
    body: 'flex flex-col gap-16',
  },
});

export { confirmBlockTheme };
