import type { FormValues } from '../../lib';

import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { fieldOf, withQueries } from '@/test/form';
import { render, screen } from '@/test/render';

import { CollectionField } from '..';

vi.mock('@/server/api', () => ({
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalogs', bankId, name],
    queryFn: () =>
      Promise.resolve({ results: [{ code: 'joint', name: 'Conjunta' }] }),
  }),
}));

// A signer answers only catalogs: the summary must show option names, not "unfilled".
const signatureType = fieldOf('catalog', {
  key: 'signature_type_id',
  collection: 'signers',
  catalog: { name: 'signature-types', source: 'unknown' },
});

const Host = () => {
  const form = useForm<FormValues>({
    defaultValues: { signers: [{ signature_type_id: 'joint' }] },
  });
  return (
    <FormProvider {...form}>
      <CollectionField
        name='signers'
        fields={[signatureType]}
        country='NI'
        bankId='BLNI'
        labelOf={(key) => key}
      />
    </FormProvider>
  );
};

describe('CollectionField summary', () => {
  it('names catalog answers by their option', async () => {
    render(<Host />, { wrapper: withQueries });

    expect(await screen.findByText('Conjunta')).toBeDefined();
  });
});
