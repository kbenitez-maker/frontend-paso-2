import { tv } from '@lafise/onyx-theme/tv';

const stepProgressTheme = tv({
  slots: {
    root: 'flex min-w-0 flex-col items-center gap-4 text-center',
    title: 'font-semibold text-base-text',
    subtitle: 'truncate text-medium-text',
  },
});

export { stepProgressTheme };
