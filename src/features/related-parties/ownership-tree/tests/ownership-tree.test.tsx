import type { CollectionHandle } from '@/shared/form/collection-field';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { OwnershipTree } from '..';

type Item = Record<string, unknown>;

const ownership = es.RelatedParties.ownership;

const legal = (
  number: string,
  name: string,
  parent: string,
  share: number,
): Item => ({
  shareholder_person_type_id: 'legal',
  shareholder_identification_type_id: 'ruc',
  shareholder_identification_number: number,
  shareholder_legal_name: name,
  shareholder_parent_company_id: parent,
  shareholder_share_percentage: share,
});

const natural = (
  number: string,
  name: string,
  parent: string,
  share: number,
): Item => ({
  shareholder_person_type_id: 'natural',
  shareholder_identification_type_id: 'national-id',
  shareholder_identification_number: number,
  shareholder_first_name: name,
  shareholder_parent_company_id: parent,
  shareholder_share_percentage: share,
});

const handleOf = (
  items: Item[],
  problems: ReadonlyMap<number, string> = new Map(),
) => {
  const list = {
    items,
    titles: items.map((_, index) => `Titulo ${String(index)}`),
    problems,
    edit: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  } satisfies CollectionHandle;
  return list;
};

const renderTree = (list: CollectionHandle, sealed?: string) =>
  render(<OwnershipTree list={list} noun='accionista' sealed={sealed} />);

const levelOne = () =>
  screen.queryByRole('button', { name: /Agregar accionista de nivel 1/u });

describe('OwnershipTree', () => {
  it('opens a first-level shareholder with the holder decided and its capital proposed', () => {
    const list = handleOf([legal('1', 'Acme', 'holder', 60)]);
    renderTree(list);

    fireEvent.click(
      screen.getByRole('button', { name: /Agregar accionista de nivel 1/u }),
    );

    expect(list.add).toHaveBeenCalledWith(
      {
        shareholder_parent_company_id: 'holder',
        shareholder_share_percentage: 40,
      },
      ['shareholder_parent_company_id'],
    );
    expect(screen.getByText(ownership.rootHint)).toBeDefined();
  });

  it('drops the first-level add once the holder is fully given out', () => {
    renderTree(handleOf([natural('9', 'Ana', 'holder', 100)]));

    expect(levelOne()).toBeNull();
  });

  it('warns when the holder gives out more than 100 %', () => {
    renderTree(
      handleOf([
        natural('9', 'Ana', 'holder', 70),
        natural('8', 'Bruno', 'holder', 50),
      ]),
    );

    expect(
      screen.getByText(ownership.over.replace('{excess}', '20.00')),
    ).toBeDefined();
  });

  it('seals the tree: the reason replaces the hint and adding is disabled', () => {
    renderTree(handleOf([legal('1', 'Acme', 'holder', 60)]), ownership.sealed);

    expect(screen.getByText(ownership.sealed)).toBeDefined();
    expect(screen.queryByText(ownership.rootHint)).toBeNull();
    expect(levelOne()?.hasAttribute('disabled')).toBe(true);
  });

  it('collapses and expands a branch, counting what it hides', () => {
    const list = handleOf([
      legal('1', 'Acme', 'holder', 100),
      legal('2', 'Beta', 'ruc|1', 50),
      natural('3', 'Carla', 'ruc|2', 50),
    ]);
    renderTree(list);
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Contraer Titulo 0' }));

    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
    expect(
      screen.getByText('2 accionistas ocultos en esta rama'),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Desplegar Titulo 0' }));

    expect(screen.getAllByRole('treeitem')).toHaveLength(3);
  });

  it('walks a cycle once instead of looping', () => {
    const list = handleOf([
      legal('1', 'Acme', 'ruc|2', 50),
      legal('2', 'Beta', 'ruc|1', 50),
    ]);
    renderTree(list);

    // Neither hangs from the holder, so the unreachable cycle is not drawn.
    expect(screen.queryAllByRole('treeitem')).toHaveLength(0);
  });

  it('adds a shareholder under a company with the capital it has left', () => {
    const list = handleOf([
      legal('1', 'Acme', 'holder', 100),
      natural('2', 'Ana', 'ruc|1', 30),
    ]);
    renderTree(list);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar accionista de Titulo 0 · queda 70.00 %',
      }),
    );

    expect(list.add).toHaveBeenCalledWith(
      {
        shareholder_parent_company_id: 'ruc|1',
        shareholder_share_percentage: 70,
      },
      ['shareholder_parent_company_id'],
    );
  });
});
