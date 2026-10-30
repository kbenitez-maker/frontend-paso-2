import { tv } from '@lafise/onyx-theme/tv';

const scoreScaleTheme = tv({
  slots: {
    scale: 'm-0 flex min-w-0 flex-wrap justify-center gap-8 border-0 p-0',
    score: 'size-44 min-w-44 rounded-12 px-0 text-[16px] font-semibold',
  },
  variants: {
    selected: {
      false: { score: 'bg-base-surface ring-light-stroke' },
    },
  },
});

export { scoreScaleTheme };
