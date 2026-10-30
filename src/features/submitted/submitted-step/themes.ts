import { tv } from '@lafise/onyx-theme/tv';

const submittedStepTheme = tv({
  slots: {
    card: 'w-full max-w-504',
    headline: 'gap-4',
    description: 'text-medium-text',
    closing: 'flex items-center gap-16 pt-0',
    // lde-web-core 1.48 has no `info` ring color: blue while the bank works (POC `enElBanco`).
    ring: `
      shrink-0
      [&_.fill-base-primary-brand]:fill-base-info
    `,
    meta: 'flex flex-col gap-4',
    reference: 'text-soft-text',
  },
});

export { submittedStepTheme };
