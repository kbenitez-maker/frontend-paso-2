import type { FieldDefinition } from '@/contracts/types';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Fresh query client per render: no retries, so failures surface at once. */
const withQueries = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const COUNTRIES = ['NI', 'PA', 'CR', 'HN', 'SV', 'DO'] as const;

/** Minimal registry field of a type, applicable everywhere. */
const fieldOf = (
  type: FieldDefinition['type'],
  extra: Partial<FieldDefinition> = {},
): FieldDefinition => ({
  key: `sample_${type}`,
  block: 'identification',
  type,
  countries: COUNTRIES,
  required: 'when_visible',
  ...extra,
});

export { fieldOf, withQueries };
