import type { RelatedPartyMatrix } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { MATRICES } from '@/test/related-party-matrix';
import { render, screen, waitFor } from '@/test/render';

import { RouteContext } from '../../lib/route-context';
import { MissingRolesNotice } from '../missing-roles-notice';

vi.mock('@/server/api', () => ({
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalog', bankId, name],
    queryFn: () =>
      Promise.resolve({
        results: [
          { code: 'legal-representative', name: 'Representante legal' },
          { code: 'board-member', name: 'Miembro de junta' },
          { code: 'president', name: 'Presidente' },
        ],
        count: 3,
      }),
  }),
}));

const Form = ({
  values,
  children,
}: {
  values: Record<string, unknown>;
  children: ReactNode;
}) => {
  const methods = useForm({ defaultValues: values });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderNotice = (
  matrix: RelatedPartyMatrix | undefined,
  values: Record<string, unknown>,
  block: 'administrators' | 'shareholders' = 'administrators',
) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouteContext value={matrix}>
        <Form values={values}>
          <MissingRolesNotice block={block} bankId='BLNI' />
        </Form>
      </RouteContext>
    </QueryClientProvider>,
  );

const admin = (roles: string[], positions: string[] = []) => ({
  admin_role_ids: roles,
  admin_board_position_ids: positions,
});

describe('MissingRolesNotice', () => {
  it('names the roles nobody holds', async () => {
    renderNotice(MATRICES.A, { administrators: [admin([])] });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        'Para esta empresa faltan los roles Representante legal, Miembro de junta.',
      );
    });
  });

  it('names the positions of a held role nobody covers', async () => {
    renderNotice(MATRICES.A, {
      administrators: [admin(['legal-representative', 'board-member'])],
    });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        'Para esta empresa falta cubrir el cargo Presidente (Miembro de junta).',
      );
    });
  });

  it('names both a missing role and an uncovered position', async () => {
    renderNotice(
      {
        ...MATRICES.A,
        sections: [
          {
            key: 'administrators',
            required_roles: [
              { role_id: 'legal-representative', position_ids: [] },
              { role_id: 'board-member', position_ids: ['president'] },
            ],
          },
        ],
      },
      { administrators: [admin(['board-member'])] },
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'falta registrar el rol Representante legal; y falta cubrir el cargo Presidente',
      );
    });
  });

  it('says nothing once the matrix is satisfied', () => {
    renderNotice(MATRICES.A, {
      administrators: [
        admin(['legal-representative', 'board-member'], ['president']),
      ],
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says nothing without a matrix, without people or for a block without people', () => {
    const { unmount } = renderNotice(undefined, {
      administrators: [admin([])],
    });
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();

    const empty = renderNotice(MATRICES.A, { administrators: [] });
    expect(screen.queryByRole('alert')).toBeNull();
    empty.unmount();

    renderNotice(MATRICES.A, { shareholders: [{}] }, 'shareholders');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
