import type { Bank } from '@/server/api';
import type { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewRequestBankProvider, useNewRequestBank } from '..';

const bank: Bank = {
  bank_id: 'BLCR',
  country: 'CR',
  name: 'Costa Rica',
  legal_name: 'Banco LAFISE Costa Rica, S.A.',
  enabled: true,
};

describe('useNewRequestBank', () => {
  it('returns the bank of the provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NewRequestBankProvider bank={bank}>{children}</NewRequestBankProvider>
    );

    const { result } = renderHook(() => useNewRequestBank(), { wrapper });

    expect(result.current).toBe(bank);
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useNewRequestBank())).toThrow(
      'NewRequestBankProvider',
    );
  });
});
