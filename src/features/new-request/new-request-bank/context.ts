'use client';

import { createContext, use } from 'react';

import type { Bank } from '@/server/api';

const NewRequestBankContext = createContext<Bank | null>(null);

/**
 * The bank every API call of `/new` is made against (catalogs, customer
 * lookups, request creation). Once the request exists, use its `bank_id`.
 */
const useNewRequestBank = (): Bank => {
  const bank = use(NewRequestBankContext);
  if (!bank)
    throw new Error('useNewRequestBank needs a NewRequestBankProvider');
  return bank;
};

export { NewRequestBankContext, useNewRequestBank };
