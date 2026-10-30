'use client';

import { useEffect, useState } from 'react';

import type { ReactNode } from 'react';

import { AutosaveProvider } from '../autosave-state';
import { OpeningLiveValuesProvider } from '../opening-live-values';
import { StepGateProvider } from '../step-gate';
import { usePreviewBank } from '../use-preview-bank';

interface FormSessionProps {
  children: ReactNode;
}

/** State shared by the pieces of the form layout: header autosave, footer gate and the page's step. */
const FormSession = ({ children }: Readonly<FormSessionProps>) => {
  const bank = usePreviewBank();
  const token = bank ?? '';
  const [applied, setApplied] = useState<string | null>(null);
  useEffect(() => {
    document.cookie =
      bank === undefined ?
        'fcj-form-bank=; path=/; Max-Age=0'
      : `fcj-form-bank=${bank}; path=/; SameSite=Lax`;
    // The cookie has to exist before the children mount their queries.
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- queries must wait for this write
    setApplied(token);
  }, [bank, token]);
  // eslint-disable-next-line security/detect-possible-timing-attacks -- bank code, not a secret
  if (applied !== token) return null;

  return (
    <AutosaveProvider>
      <StepGateProvider>
        <OpeningLiveValuesProvider>{children}</OpeningLiveValuesProvider>
      </StepGateProvider>
    </AutosaveProvider>
  );
};

export { FormSession, type FormSessionProps };
