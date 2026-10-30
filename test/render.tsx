import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { render as rtlRender } from '@testing-library/react';

import { resolveMessages } from '@/i18n/messages';
import { SupportedLocales } from '@/types/i18n';

import { NextIntlClientTestWrapper } from './next-intl';

type WrapperComponent = (props: { children: ReactNode }) => ReactElement;

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Extra provider (e.g. `QueryClientProvider`) composed inside the i18n wrapper. */
  wrapper?: WrapperComponent;
}

/**
 * Testing Library `render` wrapped with the Spanish i18n provider, so tests
 * assert against the real dictionary (`es`) instead of pasted strings.
 */
const render = (
  ui: ReactElement,
  { wrapper: ExtraWrapper, ...rest }: CustomRenderOptions = {},
): RenderResult => {
  const Wrapper: WrapperComponent = ({ children }) => (
    <NextIntlClientTestWrapper>
      {ExtraWrapper ?
        <ExtraWrapper>{children}</ExtraWrapper>
      : children}
    </NextIntlClientTestWrapper>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...rest });
};

const es = resolveMessages(SupportedLocales.Es);

export { screen, waitFor } from '@testing-library/react';

export { es, render };
