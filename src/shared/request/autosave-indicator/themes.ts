import { tv } from '@lafise/onyx-theme/tv';

const autosaveIndicatorTheme = tv({
  slots: {
    trigger: `
      flex cursor-default items-center gap-6 rounded-8 px-8 py-6 outline-2
      outline-offset-2 outline-transparent
      focus-visible:outline-base-primary-brand
    `,
    row: 'flex items-center gap-6',
    icon: '',
    /** All labels share one grid cell: the width is the widest label's. */
    labels: 'inline-grid',
    label: 'col-start-1 row-start-1 text-nowrap text-medium-text',
    hint: 'max-w-280',
  },
  variants: {
    failed: {
      true: { icon: 'text-base-error' },
      false: { icon: 'text-base-primary-brand' },
    },
    /** Hidden labels keep their room so switching status never shifts the header. */
    active: {
      true: {},
      false: { label: 'invisible' },
    },
  },
});

export { autosaveIndicatorTheme };
