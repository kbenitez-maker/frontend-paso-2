import { tv } from '@lafise/onyx-theme/tv';

const statementsTheme = tv({
  slots: {
    card: 'mt-32 w-full',
    header: 'pb-12',
    headline: 'max-w-560 gap-8',
    description: 'text-medium-text',
    clause: 'text-base-text',
  },
});

export { statementsTheme };
