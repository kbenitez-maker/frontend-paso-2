import { useEffect } from 'react';

import type { ReactNode } from 'react';

import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { es, render, screen } from '@/test/render';

import { OpeningFormField } from '..';

const Harness = ({ children }: { children: ReactNode }) => {
  const form = useForm<Record<string, unknown>>({
    defaultValues: { legal_name: 'Empresa S.A.' },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('OpeningFormField', () => {
  it('renders nothing when the field type cannot be painted', () => {
    render(
      <Harness>
        <OpeningFormField
          field={{
            code: 'company_signature',
            display_name: 'Firma digital',
            field_type: 'signature',
            display_order: 1,
          }}
          block='identification'
          bankId='BLPA'
          country='PA'
          isRequired
        />
      </Harness>,
    );

    expect(screen.queryByText('Firma digital')).toBeNull();
  });

  it('binds a mapped field to the section form', () => {
    render(
      <Harness>
        <OpeningFormField
          field={{
            code: 'legal_name',
            display_name: 'Razón social',
            field_type: 'text',
            display_order: 1,
          }}
          block='identification'
          bankId='BLPA'
          country='PA'
          isRequired
        />
      </Harness>,
    );

    expect(screen.getByText('Razón social')).toBeDefined();
  });

  it('shows the server error text on the field', async () => {
    const WithServerError = ({ children }: { children: ReactNode }) => {
      const form = useForm<Record<string, unknown>>({
        defaultValues: { legal_name: 'Empresa S.A.' },
      });
      useEffect(() => {
        form.setError('legal_name', { type: 'server', message: 'DUPLICATED' });
      }, [form]);
      return <FormProvider {...form}>{children}</FormProvider>;
    };

    render(
      <WithServerError>
        <OpeningFormField
          field={{
            code: 'legal_name',
            display_name: 'Razón social',
            field_type: 'text',
            display_order: 1,
          }}
          block='identification'
          bankId='BLPA'
          country='PA'
          isRequired
        />
      </WithServerError>,
    );

    expect(await screen.findByText(es.Form.errors.invalid)).toBeDefined();
  });
});
