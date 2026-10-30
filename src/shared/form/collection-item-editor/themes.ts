import { tv } from '@lafise/onyx-theme/tv';

const collectionItemEditorTheme = tv({
  slots: {
    dialog: 'relative flex h-[78dvh] w-896 max-w-[calc(100vw-48px)] flex-col',
    header: 'flex flex-row items-center justify-between gap-16',
    /** Covers the parent modal (its dialog is `relative`) while a child item is edited. */
    panel: 'absolute inset-0 z-10 flex flex-col bg-base-surface',
    panelHeader: 'flex flex-row items-center justify-start gap-12',
    body: 'flex flex-1 flex-col gap-16 overflow-y-auto',
    fields: 'flex flex-col gap-16',
    grid: 'grid grid-cols-2 items-start gap-x-12 gap-y-16',
    /** POC: tabs keep their width and the list scrolls instead of wrapping. */
    tab: 'min-w-fit shrink-0 px-12 text-nowrap',
    tabPanel: 'pt-16',
    groups: 'flex flex-col gap-24',
    group: 'flex flex-col gap-12',
    /** POC: a discreet sub-group heading inside the modal. */
    groupHeading: 'font-semibold text-medium-text uppercase',
    // eslint-disable-next-line better-tailwindcss/enforce-canonical-classes -- `w-xs` is the 20rem container, not 480px
    duplicateDialog: 'w-480',
    duplicateNotice: 'text-balance text-medium-text',
  },
});

export { collectionItemEditorTheme };
