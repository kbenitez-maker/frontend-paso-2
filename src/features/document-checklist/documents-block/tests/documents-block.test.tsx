import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  save: vi.fn<(body: unknown) => void>(),
  confirmation: { value: {} },
  items: { value: [] as unknown[] },
  pathname: vi.fn<() => string>(),
  block: vi.fn<() => string | null>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/server/api', () => ({
  confirmationQuery: (requestId: string) => ({
    queryKey: ['account-requests', requestId, 'confirmation'],
    queryFn: () => Promise.resolve(structuredClone(mocks.confirmation.value)),
  }),
  saveConfirmationMutation: () => ({
    mutationFn: (body: object) => {
      mocks.save(body);
      return Promise.resolve({ ...mocks.confirmation.value, ...body });
    },
  }),
  documentChecklistQuery: (requestId: string, stage: string) => ({
    queryKey: ['account-requests', requestId, 'document-checklist', stage],
    queryFn: () =>
      Promise.resolve({ stage, items: structuredClone(mocks.items.value) }),
  }),
  accountRequestQuery: (requestId: string) => ({
    queryKey: ['account-requests', requestId],
    queryFn: () => Promise.resolve({ bank_id: 'BLNI' }),
  }),
  banksQuery: () => ({
    queryKey: ['banks'],
    queryFn: () =>
      Promise.resolve({
        results: [
          {
            bank_id: 'BLNI',
            country: 'NI',
            name: 'Nicaragua',
            legal_name: 'Banco LAFISE BANCENTRO, S.A.',
          },
        ],
        count: 1,
      }),
  }),
  filePreviewQuery: () => ({ queryKey: ['preview'], queryFn: () => null }),
  uploadDocumentFileMutation: () => ({ mutationFn: () => Promise.resolve({}) }),
  deleteDocumentFileMutation: () => ({ mutationFn: () => Promise.resolve() }),
}));

const { DocumentChecklistStep } = await import('../../document-checklist-step');
const { DocumentsBlock } = await import('..');
const { DeclarationsBlock } = await import('../../declarations-block');

const ID = 'req-1';
const ALL = ['data-validated', 'declaration', 'no-commitment'];

const item = (
  id: string,
  category: string | undefined,
  withFile = false,
  fromProfile = false,
) => ({
  item_id: id,
  ...(fromProfile ? { from_profile: true } : {}),
  label: `Document ${id}`,
  description: `Description ${id}`,
  required: true,
  accepted_types: ['application/pdf'],
  max_size_bytes: 1024,
  ...(category === undefined ? {} : { category }),
  files:
    withFile ?
      [
        {
          file_id: `f-${id}`,
          name: `${id}.pdf`,
          size_bytes: 10,
          mime_type: 'application/pdf',
          uploaded_at: '2026-10-04T10:00:00.000Z',
        },
      ]
    : [],
});

const GateProbe = () => {
  const gate = useStepGate();
  return <span data-testid='gate'>{gate.canContinue ? 'open' : 'closed'}</span>;
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <StepGateProvider>
      {children}
      <GateProbe />
    </StepGateProvider>
  </QueryClientProvider>
);

const setData = (items: unknown[], accepted: string[] = []) => {
  mocks.items.value = items;
  mocks.confirmation.value = {
    fields: [],
    signer_options: [],
    signer_id: 'rep-1',
    accepted_statements: accepted,
  };
};

const renderDeclarations = (items: unknown[], accepted: string[] = []) => {
  setData(items, accepted);
  return render(<DeclarationsBlock requestId={ID} />, { wrapper });
};

describe('DocumentsBlock', () => {
  beforeEach(() => {
    mocks.save.mockClear();
  });

  it('lists only the documents of its category, the uncategorized ones counting as legal', async () => {
    setData([
      item('plain', undefined),
      item('law', 'regulatory'),
      item('deed', 'legal'),
    ]);
    render(<DocumentsBlock requestId={ID} category='legal' />, { wrapper });

    await screen.findByText('Document deed');

    expect(screen.getByText('Document plain')).toBeDefined();
    expect(screen.queryByText('Document law')).toBeNull();
    expect(
      screen.getByText(es.DocumentChecklist.documents.categories.legal),
    ).toBeDefined();
  });

  it('keeps continue closed while a document of the category is missing', async () => {
    setData([item('deed', 'legal', true), item('other', 'legal')]);
    render(<DocumentsBlock requestId={ID} category='legal' />, { wrapper });
    await screen.findByText('Document other');

    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });

  it('opens continue once its own documents are uploaded, whatever the other categories hold', async () => {
    setData([item('deed', 'legal', true), item('law', 'regulatory')]);
    render(<DocumentsBlock requestId={ID} category='legal' />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });
    expect(screen.getByText('1 de 1 cargados')).toBeDefined();
  });

  it('lists the profiling documents read-only and counts them as delivered', async () => {
    setData([item('deed', 'legal', false, true), item('poa', 'legal')]);
    render(<DocumentsBlock requestId={ID} category='legal' />, { wrapper });

    expect(
      await screen.findByText(es.BaseDocuments.upload.fromProfile),
    ).toBeDefined();
    expect(screen.getByText('1 de 2 cargados')).toBeDefined();
    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });
});

describe('DeclarationsBlock', () => {
  beforeEach(() => {
    mocks.save.mockClear();
  });

  it('keeps continue closed while a document is missing', async () => {
    renderDeclarations([item('deed', 'legal')], ALL);
    await screen.findByText(es.DocumentChecklist.statements.title);

    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });

  it('keeps continue closed until the three declarations are accepted', async () => {
    renderDeclarations([item('deed', 'legal', true)], ['declaration']);
    await screen.findByText(es.DocumentChecklist.statements.title);

    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });

  it('opens continue with every document uploaded and the three declarations accepted', async () => {
    renderDeclarations([item('deed', 'legal', true)], ALL);

    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });
  });

  it('names the bank in the declaration', async () => {
    renderDeclarations([item('deed', 'legal', true)]);

    expect(
      await screen.findByText(/autorizo a Banco LAFISE BANCENTRO, S\.A\. a/),
    ).toBeDefined();
  });

  it('saves the declarations one by one, never all at once', async () => {
    renderDeclarations([item('deed', 'legal', true)], ['declaration']);
    const row = await screen.findByRole('row', {
      name: es.DocumentChecklist.statements.items['data-validated'],
    });

    fireEvent.click(row);

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledWith({
        signer_id: 'rep-1',
        accepted_statements: ['declaration', 'data-validated'],
      });
    });
  });
});

describe('DocumentChecklistStep', () => {
  it('renders the block the route asks for, the confirmation otherwise', async () => {
    setData([item('deed', 'legal')]);
    mocks.confirmation.value = {
      fields: [],
      signer_options: [],
      signer_id: null,
      accepted_statements: [],
    };
    mocks.pathname.mockReturnValue(`/${ID}/document-checklist`);
    mocks.block.mockReturnValue(null);
    render(<DocumentChecklistStep requestId={ID} />, { wrapper });

    expect(
      await screen.findByText(es.DocumentChecklist.confirm.card.title),
    ).toBeDefined();
  });
});
