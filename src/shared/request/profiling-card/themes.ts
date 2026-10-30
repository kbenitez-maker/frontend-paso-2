import { tv } from '@lafise/onyx-theme/tv';

const profilingCardTheme = tv({
  slots: {
    card: 'w-full max-w-504',
    header: 'pb-12',
    headline: 'gap-4',
    description: 'text-medium-text',
    body: 'flex flex-col gap-16',
    /** A control with its hint and error messages. */
    field: 'flex flex-col gap-4',
    unavailable: 'flex flex-col items-start gap-8',
    unavailableText: 'text-base-error',
  },
});

export { profilingCardTheme };
