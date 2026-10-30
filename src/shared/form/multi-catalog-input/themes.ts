import { tv } from '@lafise/onyx-theme/tv';

const multiCatalogInputTheme = tv({
  base: 'flex flex-col gap-8',
  variants: {
    blocked: {
      true: 'opacity-60',
    },
  },
});

export { multiCatalogInputTheme };
