'use client';

import type { ReactNode } from 'react';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface ThemeProviderProps {
  readonly children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='light'
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
};

export { ThemeProvider };
