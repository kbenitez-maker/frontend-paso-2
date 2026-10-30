import { tv } from '@lafise/onyx-theme/tv';

const profilingCardTheme = tv({
  slots: {
    /** The way out of the notice reads as part of its sentence. */
    noticeLink: `
      inline h-auto rounded-none px-0 font-semibold text-inherit underline
      underline-offset-2
      hover:text-inherit
      pressed:text-inherit
    `,
  },
});

export { profilingCardTheme };
