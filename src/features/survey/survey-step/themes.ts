import { tv } from '@lafise/onyx-theme/tv';

const surveyStepTheme = tv({
  slots: {
    card: 'w-full max-w-696',
    header: 'pb-12',
    headline: 'gap-4',
    description: 'text-medium-text',
    body: 'flex flex-col gap-24',
    closing: 'flex items-center justify-between gap-12',
    hint: 'text-soft-text',
  },
});

export { surveyStepTheme };
