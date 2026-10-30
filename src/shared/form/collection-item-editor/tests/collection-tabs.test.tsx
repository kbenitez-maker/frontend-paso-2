import type { FieldDefinition } from '@/contracts/types';
import type { FormValues } from '../../lib';

import { fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { fieldOf, withQueries } from '@/test/form';
import { es, render, screen } from '@/test/render';

import { CollectionField } from '../../collection-field';

const fields: FieldDefinition[] = [
  fieldOf('string', {
    key: 'alias',
    collection: 'accounts',
    item_tab: 'setup',
  }),
  // The card list shows once the alias reads "card": its tab stays, with a hint.
  fieldOf('string', {
    key: 'holder',
    collection: 'additional_cards',
    parent_collection: 'accounts',
    item_tab: 'checkbook_card',
    visible_when: { field: 'alias', eq: 'card' },
  }),
  fieldOf('string', {
    key: 'purpose',
    collection: 'accounts',
    item_tab: 'compliance',
  }),
  // Applies to HN only: no "Transferencias" tab in NI.
  fieldOf('string', {
    key: 'swift',
    collection: 'accounts',
    item_tab: 'transfers',
    countries: ['HN'],
  }),
];

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

const tabs = es.Form.collections.accounts.tabs;
const tab = (name: string) =>
  screen.getByRole('tab', {
    name: (accessible) => accessible.startsWith(name),
  });
const type = (name: RegExp, value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name }), {
    target: { value },
  });
};

describe('CollectionField item tabs', () => {
  it('groups the item in tabs and saves it incomplete as a draft', async () => {
    const onValues = vi.fn<(values: FormValues) => void>();
    render(<Host onValues={onValues} />, { wrapper: withQueries });

    fireEvent.click(screen.getByRole('button', { name: 'Agregar cuenta' }));
    expect(
      screen.getAllByRole('tab').map((element) => element.textContent),
    ).toEqual([tabs.setup, tabs.checkbook_card, tabs.compliance]);
    expect(tab(tabs.setup).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(tab(tabs.checkbook_card));
    expect(screen.getByText(es.Form.collection.tabEmpty)).toBeDefined();

    fireEvent.click(tab(tabs.setup));
    type(/alias/, 'Operativa');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));
    await waitFor(() => {
      expect(onValues).toHaveBeenLastCalledWith({
        accounts: [{ alias: 'Operativa' }],
      });
    });
    // The row says what the draft lacks, and the collection names the drafts.
    expect(screen.getByText(es.Form.errors.required)).toBeDefined();
    expect(
      screen.getByText('Faltan campos por llenar en Cuenta 1.'),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Editar cuenta 1' }));
    fireEvent.click(tab(tabs.compliance));
    type(/purpose/, 'Pagos');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));
    await waitFor(() => {
      expect(onValues).toHaveBeenLastCalledWith({
        accounts: [{ alias: 'Operativa', purpose: 'Pagos' }],
      });
    });
  });

  it('renders fields without a tab above the tabs, tabs in label order and sub-group headings', async () => {
    const party = (key: string, extra: Partial<FieldDefinition>) =>
      fieldOf('string', { key, collection: 'administrators', ...extra });
    const partyFields: FieldDefinition[] = [
      party('person', {}),
      party('first', {
        item_tab: 'basic',
        item_group: 'personal',
        item_title: true,
      }),
      party('last', {
        item_tab: 'basic',
        item_group: 'personal',
        item_title: true,
      }),
      // Registry order puts the administrative tab first; the labels order it last.
      party('position', {
        item_tab: 'administrative',
        item_group: 'representative',
      }),
      party('office', { item_tab: 'basic', item_group: 'pep' }),
      party('gender', {
        item_tab: 'complementary',
        item_group: 'natural_complementary',
      }),
    ];
    const PartyHost = () => {
      const form = useForm<FormValues>();
      return (
        <FormProvider {...form}>
          <CollectionField
            name='administrators'
            fields={partyFields}
            country='NI'
            bankId='BLNI'
            labelOf={(key) => key}
          />
        </FormProvider>
      );
    };
    const labels = es.Form.collections.administrators.tabs;
    const groups = es.Form.collection.groups;
    render(<PartyHost />, { wrapper: withQueries });

    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar administrador' }),
    );
    expect(
      screen.getAllByRole('tab').map((element) => element.textContent),
    ).toEqual([labels.basic, labels.complementary, labels.administrative]);
    const header = screen.getByRole('textbox', { name: /person/ });
    expect(
      header.compareDocumentPosition(screen.getByRole('tablist')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(groups.personal)).toBeDefined();
    expect(screen.getByText(groups.pep)).toBeDefined();

    type(/person/, 'natural');
    type(/first/, 'Ana');
    type(/last/, 'Ruiz');
    fireEvent.click(tab(labels.complementary));
    // A single sub-group in the tab: no heading.
    expect(screen.queryByText(groups.natural_complementary)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar administrador' }),
    );
    // The list names the item by its title fields, even as a draft.
    expect(await screen.findByText('Ana Ruiz')).toBeDefined();
  });

  it('shows what a reopened item lacks, header included', async () => {
    const headerFields: FieldDefinition[] = [
      fieldOf('string', { key: 'person', collection: 'administrators' }),
      fieldOf('string', {
        key: 'first',
        collection: 'administrators',
        item_tab: 'basic',
        required: { NI: false },
      }),
      fieldOf('string', {
        key: 'gender',
        collection: 'administrators',
        item_tab: 'complementary',
        required: { NI: false },
      }),
    ];
    const HeaderHost = () => {
      const form = useForm<FormValues>({
        defaultValues: { administrators: [{ first: 'Ana' }] },
      });
      return (
        <FormProvider {...form}>
          <CollectionField
            name='administrators'
            fields={headerFields}
            country='NI'
            bankId='BLNI'
            labelOf={(key) => key}
          />
        </FormProvider>
      );
    };
    render(<HeaderHost />, { wrapper: withQueries });

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar administrador 1' }),
    );
    await waitFor(() => {
      expect(
        screen
          .getByRole('textbox', { name: /person/ })
          .getAttribute('aria-invalid'),
      ).toBe('true');
    });
  });
});
