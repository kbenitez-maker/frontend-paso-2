'use client';

import { useSearchParams } from 'next/navigation';

import { previewBankOf } from '@/lib/opening/preview-bank';

/** Operating bank from `?bank=`. Undefined in production and for any other value. */
const usePreviewBank = (): string | undefined =>
  previewBankOf(useSearchParams().get('bank'));

export { usePreviewBank };
