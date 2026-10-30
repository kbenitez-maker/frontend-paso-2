import { tv } from '@lafise/onyx-theme/tv';

const approvalsBlockTheme = tv({
  slots: {
    // POC: the whole row (long label).
    approver: 'col-span-2 flex flex-col gap-4',
  },
});

export { approvalsBlockTheme };
