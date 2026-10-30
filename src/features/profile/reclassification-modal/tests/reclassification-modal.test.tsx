import type { Reclassification } from '@/server/api';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { ReclassificationModal } from '..';

vi.mock('@/shared/form/hooks', () => ({
  useCatalog: ({ catalog }: { catalog: { name: string } }) => ({
    options:
      catalog.name === 'legal-entity-types' ?
        [{ code: 'trust', name: 'Fideicomisos' }]
      : [{ code: 'settlor', name: 'Fideicomitente' }],
  }),
}));

const messages = es.Profile.reclassification;

const change = (overrides: Partial<Reclassification>): Reclassification => ({
  scenario: 'roles_change',
  legal_entity_type_before: 'corporation',
  legal_entity_type_after: 'trust',
  route_before: 'A',
  route_after: 'A',
  roles_removed: [],
  roles_added: [],
  emptied_sections: [],
  removed_people: [],
  people_losing_roles: [],
  broken_links: [],
  changed_fields: 0,
  requires_confirmation: true,
  ...overrides,
});

const open = (
  overrides: Partial<Reclassification>,
  props: { isPending?: boolean } = {},
) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ReclassificationModal
      bankId='BLNI'
      change={change(overrides)}
      isPending={props.isPending ?? false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
};

describe('ReclassificationModal', () => {
  it('names the removed people on a route change, with the type by its name', () => {
    open({
      scenario: 'route_change',
      removed_people: [
        { name: 'María López', role_ids: ['settlor'] },
        { name: 'Carlos Ruiz', role_ids: [] },
      ],
    });

    expect(
      screen.getByText(/Pasar a «Fideicomisos» cambia la ruta/u).textContent,
    ).toContain('María López y Carlos Ruiz');
    expect(
      screen.getByRole('button', { name: messages.confirmAndRemove }),
    ).toBeDefined();
  });

  it('lists the roles taken away, by name, when nobody is removed', () => {
    open({
      people_losing_roles: [{ name: 'Ana Gómez', role_ids: ['settlor', 'x'] }],
    });

    expect(screen.getByText(/se retiran roles/u).textContent).toContain(
      'Ana Gómez (pierde Fideicomitente y x)',
    );
    expect(
      screen.getByRole('button', { name: messages.confirm }),
    ).toBeDefined();
  });

  it('says who is removed when nobody just loses roles', () => {
    open({ removed_people: [{ name: 'Luis Paz', role_ids: [] }] });

    const text = screen.getByText(/Se eliminará a Luis Paz/u).textContent;
    expect(text).not.toContain('También se retiran');
  });

  it('adds who also loses roles when both happen, plus broken links and fields', () => {
    open({
      removed_people: [{ name: 'Luis Paz', role_ids: [] }],
      people_losing_roles: [{ name: 'Ana Gómez', role_ids: ['settlor'] }],
      broken_links: [
        { kind: 'account_signer', position: 2, name: 'Luis Paz' },
        { kind: 'card_holder', position: 1, name: 'Ana Gómez' },
      ],
      changed_fields: 3,
    });

    const text = screen.getByText(/También se retiran roles a/u).textContent;
    expect(text).toContain('Ana Gómez (pierde Fideicomitente)');
    expect(text).toContain('Cuenta 2 · Luis Paz');
    expect(text).toContain('Tarjeta de la cuenta 1 · Ana Gómez');
    expect(text).toContain('Además cambian 3 campos');
  });

  it('confirms and cancels through its buttons and when dismissed', () => {
    const { onConfirm, onCancel } = open({
      people_losing_roles: [{ name: 'Ana Gómez', role_ids: ['settlor'] }],
    });

    fireEvent.click(screen.getByRole('button', { name: messages.confirm }));
    expect(onConfirm).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: messages.cancel }));
    expect(onCancel).toHaveBeenCalled();
  });
});
