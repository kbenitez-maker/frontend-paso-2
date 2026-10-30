import { tv } from '@lafise/onyx-theme/tv';

const helpButtonTheme = tv({
  slots: {
    panel: 'flex w-360 max-w-[calc(100vw-32px)] flex-col gap-16 p-16',
    history: 'flex max-h-200 flex-col gap-12 overflow-y-auto',
    message: 'flex flex-col gap-2 rounded-8 bg-light-surface p-12',
    signature: 'flex items-center justify-between gap-8',
    author: 'font-semibold text-base-text',
    time: 'text-soft-text',
    body: 'text-medium-text',
    origin: 'text-soft-text',
  },
});

export { helpButtonTheme };
