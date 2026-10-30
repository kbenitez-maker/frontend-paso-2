import { tv } from '@lafise/onyx-theme/tv';

const blockedScreenTheme = tv({
  slots: {
    root: 'flex flex-col items-center gap-24',
    copy: 'flex max-w-456 flex-col items-center gap-8 text-center',
    heading: 'font-semibold',
    text: 'text-balance text-medium-text',
  },
});

export { blockedScreenTheme };
