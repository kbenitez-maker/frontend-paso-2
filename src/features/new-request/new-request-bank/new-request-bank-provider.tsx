'use client';

import type { Bank } from '@/server/api';
import type { ReactNode } from 'react';

import { NewRequestBankContext } from './context';

interface NewRequestBankProviderProps {
  bank: Bank;
  children: ReactNode;
}

/** Scopes the bank chosen for `/new`; it is validated on the server and never changes. */
const NewRequestBankProvider = ({
  bank,
  children,
}: Readonly<NewRequestBankProviderProps>) => (
  <NewRequestBankContext value={bank}>{children}</NewRequestBankContext>
);

export { NewRequestBankProvider };
