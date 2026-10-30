// cspell:ignore jerarquica Beto
import type { RelatedPartyMatrix } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from '@lafise/onyx-ui/status/toast';

import { FormSession } from '@/shared/request/form-session';
import { MATRICES } from '@/test/related-party-matrix';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  search: vi.fn<() => URLSearchParams>(),
  replace: vi.fn<(href: string) => void>(),
  matrix: vi.fn<() => RelatedPartyMatrix>(),
  sections: vi.fn<() => Record<string, Record<string, unknown>>>(),
  save: vi.fn<
    (section: string, mode: string, body: unknown) => Promise<void>
  >(),
  ownership: vi.fn<() => unknown>(),
  confirm: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/r1/related-parties',
  useSearchParams: mocks.search,
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));

vi.mock('@/server/api', async () => ({
  ...(await import('@/test/related-party-matrix')).routeQueries(
    mocks.matrix,
    mocks.sections,
  ),
  accountRequestQuery: (id: string) => ({
    queryKey: ['request', id],
    queryFn: () =>
      Promise.resolve({
        request_id: id,
        bank_id: 'BLNI',
        profile: { person_type: 'legal', country: 'NI' },
      }),
  }),
  relatedPersonsQuery: (id: string) => ({
    queryKey: ['related-persons', id],
    queryFn: () => Promise.resolve({ results: [] }),
  }),
  catalogQuery: (bankId: string, name: string) => ({
    queryKey: ['catalog', bankId, name],
    queryFn: () =>
      Promise.resolve(
        name === 'related-party-roles' ?
          {
            results: [
              { code: 'legal-representative', name: 'Representante legal' },
              { code: 'board-member', name: 'Miembro de junta directiva' },
            ],
            count: 2,
          }
        : name === 'board-positions' ?
          { results: [{ code: 'president', name: 'Presidente' }], count: 1 }
        : { results: [], count: 0 },
      ),
  }),
  ownershipStructureQuery: (id: string) => ({
    queryKey: ['ownership', id],
    queryFn: () => Promise.resolve(mocks.ownership()),
  }),
  confirmOwnershipMutation: () => ({ mutationFn: mocks.confirm }),
  reopenOwnershipMutation: () => ({ mutationFn: mocks.confirm }),
  sectionMutation: (_id: string, section: string, mode: string) => ({
    mutationFn: async (body: unknown) => {
      await mocks.save(section, mode, body);
      return { section_key: section, state: mode, data: body };
    },
  }),
}));

const { RelatedPartiesStep } = await import('../related-parties-step');

const labels = es.RelatedPartiesFields.labels;
const waiting = es.Steps.rail.waiting;

/** Administrators holding the roles MATRICES.A requires. */
const COMPLETE_ADMINS = [
  {
    admin_person_type_id: 'natural',
    admin_role_ids: ['legal-representative', 'board-member'],
    admin_board_position_ids: ['president'],
  },
];

const UNCONFIRMED = {
  threshold: 10,
  confirmation: null,
  current: false,
  beneficiaries: [],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <FormSession>{children}</FormSession>
  </QueryClientProvider>
);

const renderBlock = (
  matrix: RelatedPartyMatrix,
  block: string,
  sections: Record<string, Record<string, unknown>> = {},
) => {
  mocks.matrix.mockReturnValue(matrix);
  mocks.sections.mockReturnValue(sections);
  mocks.search.mockReturnValue(new URLSearchParams({ block }));
  render(<RelatedPartiesStep requestId='r1' />, { wrapper });
};

// Full-step renders with several async lookups; the default 5 s timed out under full-suite load.
describe('RelatedPartiesStep', () => {
  beforeEach(() => {
    mocks.search.mockReset();
    mocks.replace.mockReset();
    mocks.save.mockReset();
    mocks.save.mockResolvedValue();
    mocks.ownership.mockReturnValue(UNCONFIRMED);
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(UNCONFIRMED);
  });

  it('opens route A with the listing question and asks the exchange of a listed holder', async () => {
    renderBlock(MATRICES.A, 'holder-listing', {
      'holder-listing': { holder_is_listed: true },
    });

    expect(await screen.findByText(labels.holder_is_listed)).toBeDefined();
    expect(
      await screen.findByText(labels.holder_stock_profile_url),
    ).toBeDefined();
  });

  it('stops an unmapped legal entity type at the listing question', async () => {
    renderBlock(MATRICES.unmapped, 'holder-listing');

    expect(
      await screen.findByText(es.Form.errors.unmapped_entity_type),
    ).toBeDefined();
  });

  it('shows the natural-person and signer questions of an administrator', async () => {
    renderBlock(MATRICES.A, 'administrators', {
      'holder-listing': { holder_is_listed: false },
      administrators: {
        administrators: [
          { admin_person_type_id: 'natural', admin_role_ids: ['signatory'] },
        ],
      },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar administrador 1' }),
    );

    expect(await screen.findByText(labels.admin_first_name)).toBeDefined();
    expect(screen.queryByText(labels.admin_legal_name)).toBeNull();
    // POC: the signer profile lives in the "Rol administrativo" tab.
    fireEvent.click(
      screen.getByRole('tab', {
        name: es.Form.collections.administrators.tabs.administrative,
      }),
    );
    expect(await screen.findByText(labels.admin_has_dependents)).toBeDefined();
  });

  it('names the roles and positions the matrix still requires', async () => {
    renderBlock(MATRICES.A, 'administrators', {
      'holder-listing': { holder_is_listed: false },
      administrators: {
        administrators: [
          {
            admin_person_type_id: 'natural',
            admin_role_ids: ['board-member'],
          },
        ],
      },
    });

    expect(
      await screen.findByText(
        'Para esta empresa falta registrar el rol Representante legal; y falta cubrir el cargo Presidente (Miembro de junta directiva).',
      ),
    ).toBeDefined();
  });

  it('keeps the shareholders waiting until administrators are complete', async () => {
    renderBlock(MATRICES.A, 'shareholders', {
      'holder-listing': { holder_is_listed: false },
    });

    expect(await screen.findByText(waiting.shareholders)).toBeDefined();
  });

  it('shows the company questions of a legal-person shareholder', async () => {
    renderBlock(MATRICES.A, 'shareholders', {
      'holder-listing': { holder_is_listed: false },
      administrators: { administrators: COMPLETE_ADMINS },
      shareholders: { shareholders: [{ shareholder_person_type_id: 'legal' }] },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Accionista 1' }),
    );

    expect(
      await screen.findByText(labels.shareholder_legal_name),
    ).toBeDefined();
    expect(screen.queryByText(labels.shareholder_first_name)).toBeNull();
  });

  it('registers the governing body of route B with its powers confirmation', async () => {
    renderBlock(MATRICES.B, 'administrators');

    expect(
      await screen.findByText(es.Steps.blocks['governing-body']),
    ).toBeDefined();
    expect(await screen.findByText(labels.powers_reviewed)).toBeDefined();
  });

  it('opens the first block of the route when the block is not in it', async () => {
    renderBlock(MATRICES.C, 'holder-listing');

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(
        '/r1/related-parties?block=trust-administrators',
      );
    });
  });

  it('asks trusts for their parties once the administration is complete', async () => {
    renderBlock(MATRICES.C, 'trust-parties', {
      'trust-administrators': {
        trust_administrators: [{ trust_admin_role_ids: ['trust-manager'] }],
      },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agregar parte' }),
    );

    expect(
      await screen.findByText(labels.trust_party_person_type_id),
    ).toBeDefined();
  });

  it('keeps the trust closing waiting for the parties', async () => {
    renderBlock(MATRICES.C, 'trust-closing');

    expect(await screen.findByText(waiting['trust-closing'])).toBeDefined();
  });

  // POC screen (not reclasificacion.ts): the listing answer only hides or shows the shareholders.
  describe('listing answer', () => {
    const SHAREHOLDERS = {
      shareholders: [
        {
          shareholder_person_type_id: 'natural',
          shareholder_first_name: 'Diana',
        },
      ],
    };
    const sections = (listed: boolean) => ({
      'holder-listing': { holder_is_listed: listed },
      administrators: { administrators: COMPLETE_ADMINS },
      shareholders: SHAREHOLDERS,
    });

    it('answers "Yes" without a modal and leaves the shareholders saved', async () => {
      renderBlock(MATRICES.A, 'holder-listing', sections(false));
      fireEvent.click(await screen.findByRole('radio', { name: 'Sí' }));

      expect(
        await screen.findByText(labels.holder_stock_profile_url),
      ).toBeDefined();
      expect(screen.queryByRole('alertdialog')).toBeNull();
      await waitFor(() => {
        expect(mocks.save).toHaveBeenCalledWith('holder-listing', 'draft', {
          holder_is_listed: true,
        });
      });
      expect(mocks.save.mock.calls.map(([section]) => section)).not.toContain(
        'shareholders',
      );
    });

    it('hides the shareholders block of a listed holder', async () => {
      renderBlock(MATRICES.A, 'shareholders', sections(true));

      await waitFor(() => {
        expect(mocks.replace).toHaveBeenCalledWith(
          '/r1/related-parties?block=holder-listing',
        );
      });
    });

    it('shows the shareholders again, with their data, once the holder is not listed', async () => {
      renderBlock(MATRICES.A, 'shareholders', sections(false));

      expect(await screen.findByText('Diana')).toBeDefined();
      expect(mocks.replace).not.toHaveBeenCalled();
    });
  });

  // POC lista-jerarquica.tsx, resumen-estructura.tsx, tabla-de-beneficiarios.tsx and modal-de-desglose.tsx.
  describe('ownership structure', () => {
    const ALFA = 'ruc|j0310000012345';
    const natural = (
      parent: string,
      share: number,
      first: string,
      number: string,
    ) => ({
      shareholder_person_type_id: 'natural',
      shareholder_parent_company_id: parent,
      shareholder_share_percentage: share,
      shareholder_first_name: first,
      shareholder_last_name: 'Ruiz',
      shareholder_identification_type_id: 'national-id',
      shareholder_identification_number: number,
      shareholder_birth_country_id: 'NI',
      shareholder_birth_date: '1980-01-01',
      shareholder_identification_expiry_date: '2030-01-01',
      shareholder_is_pep: false,
      shareholder_is_public_figure: false,
    });
    const ALFA_ITEM = {
      shareholder_person_type_id: 'legal',
      shareholder_parent_company_id: 'holder',
      shareholder_share_percentage: 40,
      shareholder_legal_name: 'Inversiones Alfa S.A.',
      shareholder_trade_name: 'Alfa',
      shareholder_identification_type_id: 'ruc',
      shareholder_identification_number: 'J0310000012345',
      shareholder_legal_entity_type_id: 'corporation',
      shareholder_incorporation_country_id: 'NI',
      shareholder_company_country_id: 'NI',
      shareholder_is_listed: false,
      shareholder_has_minority_shareholders: false,
    };
    const STRUCTURE = [
      natural('holder', 60, 'María', '001-120385-0012C'),
      ALFA_ITEM,
      natural(ALFA, 100, 'Beto', '001-240779-0003X'),
    ];
    const sections = (shareholders: unknown[]) => ({
      'holder-listing': { holder_is_listed: false },
      administrators: { administrators: COMPLETE_ADMINS },
      shareholders: { shareholders },
    });
    const copy = es.RelatedParties.ownership;

    it('adds a shareholder of a company with the company locked and its capital proposed', async () => {
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE.slice(0, 2)));

      expect(
        await screen.findByText(
          'Faltan por registrar los accionistas de: Inversiones Alfa S.A..',
        ),
      ).toBeDefined();
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Agregar accionista de Inversiones Alfa S.A. · queda 100.00 %',
        }),
      );

      expect(await screen.findByDisplayValue('100')).toBeDefined();
      expect(
        screen.getAllByText(
          'Nivel 1 · Inversiones Alfa S.A. · sin accionistas todavía',
        ).length,
      ).toBeGreaterThan(0);
    });

    it('confirms a squared structure on what the server holds', async () => {
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE));
      const confirm = await screen.findByRole('button', {
        name: copy.summary.confirm,
      });
      await waitFor(() => {
        expect(confirm.hasAttribute('disabled')).toBe(false);
      });
      fireEvent.click(confirm);

      await waitFor(() => {
        expect(mocks.confirm).toHaveBeenCalled();
      });
      expect(mocks.save).toHaveBeenCalledWith('shareholders', 'draft', {
        shareholders: expect.any(Array) as unknown,
      });
    });

    it('asks to register an open company from the summary, with the company decided', async () => {
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE.slice(0, 2)));

      fireEvent.click(
        await screen.findByRole('button', {
          name: 'Registrar los accionistas de Inversiones Alfa S.A.',
        }),
      );

      expect(await screen.findByDisplayValue('100')).toBeDefined();
    });

    it('asks for the first shareholders and offers no calculation while the list is empty', async () => {
      renderBlock(MATRICES.A, 'shareholders', sections([]));

      expect(await screen.findByText(copy.summary.empty)).toBeDefined();
      expect(
        screen.queryByRole('button', { name: copy.summary.confirm }),
      ).toBeNull();
    });

    it('tells apart a company registered under more than one point of the structure', async () => {
      renderBlock(
        MATRICES.A,
        'shareholders',
        sections([
          { ...ALFA_ITEM, shareholder_share_percentage: 30 },
          { ...ALFA_ITEM, shareholder_share_percentage: 30 },
        ]),
      );

      expect(
        await screen.findByText(
          /Inversiones Alfa S\.A\. participa en más de un punto/u,
        ),
      ).toBeDefined();
    });

    it('withdraws the seal of a calculation older than the list and offers to confirm again', async () => {
      mocks.ownership.mockReturnValue({
        ...UNCONFIRMED,
        confirmation: {
          fingerprint: 'older-list',
          confirmed_at: '2026-10-04T12:00:00.000Z',
          threshold: 10,
        },
      });
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE));

      expect(await screen.findByText(copy.summary.stale)).toBeDefined();
      expect(screen.getByText(copy.summary.rule)).toBeDefined();
      expect(
        screen.getByRole('button', { name: copy.summary.reconfirm }),
      ).toBeDefined();
    });

    it('reopens a sealed structure', async () => {
      const { fingerprintOf } = await import('@/lib/ownership');
      mocks.ownership.mockReturnValue({
        ...UNCONFIRMED,
        confirmation: {
          fingerprint: fingerprintOf(STRUCTURE),
          confirmed_at: '2026-10-04T12:00:00.000Z',
          threshold: 10,
        },
        current: true,
      });
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE));

      fireEvent.click(
        await screen.findByRole('button', { name: copy.summary.reopen }),
      );

      await waitFor(() => {
        expect(mocks.confirm).toHaveBeenCalled();
      });
    });

    it('reports a failed reopening the same way', async () => {
      const { fingerprintOf } = await import('@/lib/ownership');
      const error = vi.spyOn(toast, 'error').mockImplementation(() => '');
      mocks.confirm.mockRejectedValue(new Error('server down'));
      mocks.ownership.mockReturnValue({
        ...UNCONFIRMED,
        confirmation: {
          fingerprint: fingerprintOf(STRUCTURE),
          confirmed_at: '2026-10-04T12:00:00.000Z',
          threshold: 10,
        },
        current: true,
      });
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE));

      fireEvent.click(
        await screen.findByRole('button', { name: copy.summary.reopen }),
      );

      await waitFor(() => {
        expect(error).toHaveBeenCalledWith(
          expect.objectContaining({ heading: copy.failed.title }),
        );
      });
      error.mockRestore();
    });

    it('reports a failed calculation without breaking the block', async () => {
      const error = vi.spyOn(toast, 'error').mockImplementation(() => '');
      mocks.confirm.mockRejectedValue(new Error('server down'));
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE));
      const confirm = await screen.findByRole('button', {
        name: copy.summary.confirm,
      });
      await waitFor(() => {
        expect(confirm.hasAttribute('disabled')).toBe(false);
      });
      fireEvent.click(confirm);

      await waitFor(() => {
        expect(error).toHaveBeenCalledWith(
          expect.objectContaining({ heading: copy.failed.title }),
        );
      });
      error.mockRestore();
    });

    it('seals the tree and explains each total with its route', async () => {
      const { fingerprintOf } = await import('@/lib/ownership');
      mocks.ownership.mockReturnValue({
        ...UNCONFIRMED,
        confirmation: {
          fingerprint: fingerprintOf(STRUCTURE),
          confirmed_at: '2026-10-04T12:00:00.000Z',
          threshold: 10,
        },
        current: true,
      });
      renderBlock(MATRICES.A, 'shareholders', sections(STRUCTURE));

      expect(await screen.findByText(copy.sealed)).toBeDefined();
      expect(
        screen.getByRole('button', { name: 'Eliminar Beto Ruiz' }),
      ).toHaveProperty('disabled', true);
      expect(screen.getAllByText(copy.results.beneficial)).toHaveLength(2);
      fireEvent.click(
        screen.getByRole('button', { name: copy.results.showRoute }),
      );

      expect(
        await screen.findByText('La cuenta: 40.00 % × 100.00 % = 40.00 %'),
      ).toBeDefined();
    });
  });
});
