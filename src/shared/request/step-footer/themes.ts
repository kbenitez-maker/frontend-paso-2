import { tv } from '@lafise/onyx-theme/tv';

const stepFooterTheme = tv({
  slots: {
    footer: `
      fixed inset-x-0 bottom-0 z-20 h-72 border-t border-light-stroke
      bg-base-surface px-24
    `,
    inner: 'mx-auto flex size-full max-w-696 items-center',
    actions: 'ml-auto flex items-center gap-12',
    /** Extra classes of a button-styled link that leaves the zone. */
    externalLink: '',
  },
  variants: {
    variant: {
      /** `Link` adds a brand hover color that an outline button does not have. */
      outline: {
        externalLink: `
          hover:text-base-text
          pressed:text-base-text
        `,
      },
      primary: {},
    },
  },
});

export { stepFooterTheme };
