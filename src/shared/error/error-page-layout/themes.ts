import { tv } from '@lafise/onyx-theme/tv';

const errorPageLayoutTheme = tv({
  slots: {
    root: `
      fixed inset-0 z-50 flex h-dvh w-dvw flex-col overflow-auto
      bg-base-background
    `,
    header: 'flex w-full shrink-0 items-center justify-start px-48 pt-48 pb-20',
    body: 'flex flex-1 flex-col items-center justify-center px-24',
  },
});

export { errorPageLayoutTheme };
