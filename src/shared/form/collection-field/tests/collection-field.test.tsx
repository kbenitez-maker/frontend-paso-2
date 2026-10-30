import type { FieldDefinition } from '@/contracts/types';
import type { FormValues } from '../../lib';

import { fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { fieldOf, withQueries } from '@/test/form';
import { es, render, screen } from '@/test/render';

import { CollectionField } from '..';

// Neither the list minimum (2) nor the child minimum (1) blocks saving an item.
const alias = fieldOf('string', {
  key: 'alias',
  collection: 'accounts',
  min_items: 2,
});
const holder = fieldOf('string', {
  key: 'holder',
  collection: 'additional_cards',
  parent_collection: 'accounts',
  min_items: 1,
});
const fields: FieldDefinition[] = [alias, holder];

/** The step form: reports what it holds after every change. */
const Host = ({ onValues }: { onValues: (values: FormValues) => void }) => {
  const form = useForm<FormValues>();
  onValues(useWatch({ control: form.control }));
  return (
    <FormProvider {...form}>
      <CollectionField
        name='accounts'
        fields={fields}
        country='NI'
        bankId='BLNI'
        labelOf={(key) => key}
      />
    </FormProvider>
  );
};

const copy = es.Form.collection;
const type = (name: RegExp, value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name }), {
    target: { value },
  });
};
const press = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('CollectionField with a child collection', () => {
  it('adds, edits and deletes child items inside the parent draft', async () => {
    const onValues = vi.fn<(values: FormValues) => void>();
    render(<Host onValues={onValues} />, { wrapper: withQueries });

    press('Agregar cuenta');
    type(/alias/, 'Operativa');
    expect(screen.getByText('Tarjetas adicionales')).toBeDefined();

    // Add: a panel over the account modal, with a back button.
    press('Agregar tarjeta');
    expect(screen.getByRole('button', { name: copy.back })).toBeDefined();
    type(/holder/, 'Ana');
    press('Guardar tarjeta');
    await screen.findByText('Ana');

    // Edit the child item.
    press('Editar tarjeta 1');
    type(/holder/, 'Luis');
    press('Guardar tarjeta');
    await screen.findByText('Luis');

    // Delete it: no confirmation unless the change breaks another section (POC).
    press('Eliminar tarjeta 1');
    await screen.findByText('Todavía no ha agregado ninguna tarjeta.');

    // Nothing reached the step form yet: child edits live in the parent draft.
    expect(onValues.mock.calls.some(([values]) => 'accounts' in values)).toBe(
      false,
    );

    // Below the child minimum the account still saves, as a draft the list flags.
    press('Guardar cuenta');
    await waitFor(() => {
      expect(onValues).toHaveBeenLastCalledWith({
        accounts: [{ alias: 'Operativa' }],
      });
    });
    expect(screen.getByText(es.Form.errors.min_items)).toBeDefined();
    // One account of a minimum of two: the collection's own product copy, as an error.
    expect(screen.getByRole('alert').textContent).toBe(
      es.Form.collections.accounts.missing,
    );

    press('Editar cuenta 1');
    press('Agregar tarjeta');
    type(/holder/, 'Ana');
    press('Guardar tarjeta');
    await screen.findByText('Ana');
    press('Guardar cuenta');

    await waitFor(() => {
      expect(onValues).toHaveBeenLastCalledWith({
        accounts: [
          { alias: 'Operativa', additional_cards: [{ holder: 'Ana' }] },
        ],
      });
    });
    expect(screen.queryByText(es.Form.errors.min_items)).toBeNull();
  });
});

describe('CollectionField identity', () => {
  const person = (key: string, extra: Partial<FieldDefinition> = {}) =>
    fieldOf('string', { key, collection: 'administrators', ...extra });
  const people: FieldDefinition[] = [
    person('id_type', { identity: true }),
    person('id_number', { identity: true }),
    person('first', { item_title: true }),
  ];
  const PeopleHost = () => {
    const form = useForm<FormValues>({
      defaultValues: {
        administrators: [{ id_type: 'cc', id_number: '001', first: 'Ana' }],
      },
    });
    return (
      <FormProvider {...form}>
        <CollectionField
          name='administrators'
          fields={people}
          country='NI'
          bankId='BLNI'
          labelOf={(key) => key}
        />
      </FormProvider>
    );
  };

  it('offers to open the saved item when the same person is added twice', async () => {
    render(<PeopleHost />, { wrapper: withQueries });

    press('Agregar administrador');
    type(/id_type/, 'CC');
    type(/id_number/, ' 001 ');
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain(copy.duplicate.title);

    fireEvent.click(screen.getByRole('button', { name: copy.duplicate.open }));
    await screen.findByRole('heading', { name: 'Administrador 1' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      screen.getByRole('textbox', { name: /first/ }).getAttribute('value'),
    ).toBe('Ana');
  });
});
