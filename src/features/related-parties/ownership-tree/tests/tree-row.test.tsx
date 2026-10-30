import type { CollectionHandle } from '@/shared/form/collection-field';
import type { Row } from '../types';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { TreeRow } from '../tree-row';

const party = (overrides: Partial<Row['party']> = {}): Row['party'] => ({
  id: '0',
  parent: 'holder',
  percentage: 40,
  natural: false,
  legal: true,
  document: 'ruc|1',
  name: 'Acme',
  listed: false,
  minority: 0,
  ...overrides,
});

const setup = ({
  row = { party: party(), depth: 0, below: 0, hasChildren: false },
  item = {},
  problem,
  free = 60,
  isCollapsed = false,
  isFrozen = false,
}: {
  row?: Row;
  item?: Record<string, unknown>;
  problem?: string;
  free?: number;
  isCollapsed?: boolean;
  isFrozen?: boolean;
} = {}) => {
  const list = {
    items: [item],
    titles: ['Acme'],
    problems: problem === undefined ? new Map() : new Map([[0, problem]]),
    edit: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  } satisfies CollectionHandle;
  const onToggle = vi.fn();
  const onAdd = vi.fn();
  render(
    <TreeRow
      row={row}
      list={list}
      noun='accionista'
      title='Acme'
      free={free}
      isCollapsed={isCollapsed}
      isFrozen={isFrozen}
      onToggle={onToggle}
      onAdd={onAdd}
    />,
  );
  return { list, onToggle, onAdd };
};

describe('TreeRow', () => {
  it('shows the share and identification as detail, and edits or removes the item', () => {
    const { list } = setup({
      item: {
        shareholder_share_percentage: 40,
        shareholder_identification_number: '123',
      },
    });

    expect(screen.getByText('40 % · 123')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Acme' }));
    expect(list.edit).toHaveBeenCalledWith(0);
    expect(list.remove).toHaveBeenCalledWith(0);
  });

  it('keeps only what is filled in as detail', () => {
    setup({ item: { shareholder_share_percentage: 40 } });

    expect(screen.getByText('40 %')).toBeDefined();
  });

  it('prefers the problem of an incomplete item over its detail', () => {
    setup({
      item: { shareholder_share_percentage: 40 },
      problem: 'Falta el documento',
    });

    expect(screen.getByText('Falta el documento')).toBeDefined();
    expect(screen.queryByText('40 %')).toBeNull();
  });

  it('draws no detail line when there is nothing to say', () => {
    setup();

    expect(screen.queryByText(/ %/u)).toBeNull();
  });

  it('indents a nested row, marks its level and offers no add on a person', () => {
    setup({
      row: {
        party: party({ legal: false, natural: true }),
        depth: 2,
        below: 0,
        hasChildren: false,
      },
    });

    const item = screen.getByRole('treeitem');
    expect(item.getAttribute('aria-level')).toBe('4');
    expect(item.getAttribute('aria-expanded')).toBeNull();
    expect(item.style.paddingInlineStart).toBe('48px');
    expect(screen.queryByRole('button', { name: /Agregar/u })).toBeNull();
  });

  it('toggles a branch and, collapsed, says how many it hides', () => {
    const row = { party: party(), depth: 0, below: 3, hasChildren: true };
    const { onToggle } = setup({ row, isCollapsed: true });

    expect(screen.getByRole('treeitem').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(
      screen.getByText('3 accionistas ocultos en esta rama'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Desplegar Acme' }));
    expect(onToggle).toHaveBeenCalledWith('0');
  });

  it('adds under the company, or says it is full and disables the add', () => {
    const { onAdd } = setup({ free: 25 });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar accionista de Acme · queda 25.00 %',
      }),
    );
    expect(onAdd).toHaveBeenCalledWith('0');
  });

  it('disables add and remove when the structure is sealed or the company is full', () => {
    setup({ free: 0, isFrozen: true });

    const full = screen.getByRole('button', {
      name: 'Acme ya tiene su capital repartido al 100 %',
    });
    expect(full.hasAttribute('disabled')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Eliminar Acme' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
});
