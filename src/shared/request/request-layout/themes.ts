import { tv } from '@lafise/onyx-theme/tv';

const requestLayoutTheme = tv({
  slots: {
    root: 'min-h-dvh bg-base-background',
    content: '',
    /** Content column; without a rail it is also capped on very wide screens. */
    column: `
      w-full px-24
      xl:px-96
    `,
    header: 'px-0! pb-20!',
    start: 'min-h-56 flex-1',
    center: 'min-w-0 px-32',
    end: 'flex flex-1 items-center gap-24',
    main: `
      flex w-full justify-center px-24 pt-32
      xl:px-96
    `,
    close: 'shrink-0',
    // eslint-disable-next-line better-tailwindcss/enforce-canonical-classes -- `w-xs` is the 20rem container, not 480px
    exitDialog: 'relative w-480 max-w-[calc(100vw-48px)]',
  },
  variants: {
    hasRail: {
      true: { content: 'min-[1280px]:ml-325' },
      false: { column: 'mx-auto max-w-1512', main: 'mx-auto max-w-1512' },
    },
    /** Room for the fixed footer so content never hides behind it. */
    hasFooter: {
      true: { main: 'pb-96' },
      false: { main: 'pb-48' },
    },
  },
});

export { requestLayoutTheme };
