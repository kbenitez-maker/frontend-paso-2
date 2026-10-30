import { tv } from '@lafise/onyx-theme/tv';
import { buttonTheme } from '@lafise/onyx-ui/base/button';

/**
 * Empty, uploading and loaded states share one anatomy (a box on top, the
 * title below) so dropping a file only changes what is inside the box.
 */
const uploadBoxTheme = tv({
  slots: {
    box: `
      flex w-full shrink-0 flex-col items-center justify-center gap-8 rounded-16
      border border-light-stroke px-16 text-center transition-colors
    `,
  },
});

const uploadCardTheme = tv({
  slots: {
    root: `
      flex min-h-350 w-full max-w-284 flex-1 flex-col rounded-16 border
      transition-colors
    `,
    body: 'flex h-full flex-col gap-10 p-16',
    caption: 'flex min-w-0 flex-1 flex-col gap-4',
    label: 'line-clamp-2 font-bold text-base-text',
    description: 'line-clamp-2',
  },
  variants: {
    state: {
      empty: {
        root: `
          border-medium-stroke bg-base-surface
          hover:bg-light-surface
        `,
      },
      over: {
        root: 'border-base-primary-brand bg-lightest-primary-brand',
      },
      loaded: { root: 'border-medium-stroke bg-base-surface' },
      error: {
        root: `
          border-medium-stroke bg-base-surface
          hover:bg-light-surface
        `,
      },
    },
    /** Amber, not red: it is something to fix, not a failure. */
    warning: {
      true: { description: 'text-base-warning' },
      false: { description: 'text-medium-text' },
    },
  },
});

/** The template download is an outline `Button` look on a `Link`. */
const templateLinkTheme = tv({
  extend: buttonTheme,
  base: `
    self-start
    hover:text-base-text
    pressed:text-base-text
  `,
});

const dropZoneTheme = tv({
  extend: uploadBoxTheme,
  slots: {
    box: `
      h-250 outline-none
      hover:border-medium-stroke hover:bg-light-surface
    `,
    prompt: 'text-base-text',
    hint: 'text-soft-text',
    icon: '',
  },
  variants: {
    warning: {
      true: { icon: 'text-base-warning' },
      false: { icon: 'text-base-icon' },
    },
  },
});

const uploadProgressTheme = tv({
  extend: uploadBoxTheme,
  slots: {
    box: 'h-250 gap-12',
    figure: 'flex items-baseline gap-1',
    percent: 'text-heading-xl font-bold text-base-text tabular-nums',
    unit: 'font-bold text-medium-text',
    remaining: 'text-soft-text',
    details: 'flex w-full min-w-0 flex-col gap-4',
    name: 'min-w-0 truncate text-nowrap text-base-text',
    sent: 'text-left text-soft-text',
  },
});

const fileThumbnailTheme = tv({
  slots: {
    frame: `
      relative flex h-250 w-full shrink-0 items-end justify-end overflow-hidden
      rounded-16 border border-medium-stroke bg-light-surface p-16
    `,
    icon: 'absolute inset-0 m-auto text-medium-icon',
    pdf: 'pointer-events-none absolute',
    image: 'rounded-16 object-cover',
    fade: `
      absolute inset-0 rounded-16 bg-linear-to-t from-base-surface/70 from-6%
      to-transparent to-36%
    `,
    preview: 'relative rounded-full',
  },
});

const fileFooterTheme = tv({
  slots: {
    root: 'flex min-w-0 flex-1 items-center gap-16',
    caption: 'flex min-w-0 flex-1 flex-col gap-4',
    label: 'line-clamp-2 font-bold text-base-text',
    meta: 'flex min-w-0 items-center gap-6',
    /** `text-nowrap` explicit: `Text` brings `text-balance`, which beats the one `truncate` applies. */
    name: 'min-w-0 truncate text-nowrap text-base-text',
    size: 'shrink-0 font-semibold text-base-primary-brand',
    actions: 'flex shrink-0 items-center gap-8',
    action: 'rounded-full',
  },
});

export {
  dropZoneTheme,
  fileFooterTheme,
  fileThumbnailTheme,
  templateLinkTheme,
  uploadCardTheme,
  uploadProgressTheme,
};
