'use client';

import { createContext, use } from 'react';

import type { Confirmation, ConfirmationChoices } from '@/server/api';

/** State of the review shared by the parts of the confirm block. */
interface ConfirmBlockContextValue {
  requestId: string;
  confirmation: Confirmation;
  choose: (change: Partial<ConfirmationChoices>) => void;
}

const ConfirmBlockContext = createContext<ConfirmBlockContextValue | undefined>(
  undefined,
);

const useConfirmBlock = (): ConfirmBlockContextValue => {
  const context = use(ConfirmBlockContext);
  if (context === undefined) {
    throw new Error('useConfirmBlock must be used within a ConfirmBlock');
  }
  return context;
};

export { ConfirmBlockContext, useConfirmBlock, type ConfirmBlockContextValue };
