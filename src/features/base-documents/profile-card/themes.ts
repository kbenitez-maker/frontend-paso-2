import { tv } from '@lafise/onyx-theme/tv';

const profileCardTheme = tv({
  slots: {
    root: `
      flex min-h-350 w-full max-w-284 flex-1 flex-col rounded-16 border
      border-medium-stroke bg-base-surface
    `,
    body: 'flex h-full flex-col gap-10 p-16',
    placeholder: `
      relative h-250 w-full shrink-0 rounded-16 border border-medium-stroke
      bg-light-surface
    `,
    icon: 'absolute inset-0 m-auto text-medium-icon',
    caption: 'flex min-w-0 flex-1 flex-col gap-4',
    label: 'line-clamp-2 font-bold text-base-text',
    origin: 'truncate text-soft-text',
  },
});

export { profileCardTheme };
