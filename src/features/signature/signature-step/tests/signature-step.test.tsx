import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  push: vi.fn<(href: string) => void>(),
  bank: { value: {} },
  success: vi.fn<(toast: unknown) => void>(),
  warning: vi.fn<(toast: unknown) => void>(),
  error: vi.fn<(toast: unknown) => void>(),
  submit: vi.fn<() => Promise<unknown>>(),
  ran: { value: undefined as boolean | undefined },
}));

vi.mock('@lafise/onyx-ui/status/toast', () => ({
  toast: {
    success: mocks.success,
    warning: mocks.warning,
    error: mocks.error,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/server/api', () => ({
  bankDocumentsQuery: (requestId: string) => ({
    queryKey: ['account-requests', requestId, 'document-checklist', 'bank'],
    queryFn: () => Promise.resolve(structuredClone(mocks.bank.value)),
  }),
  filePreviewQuery: () => ({ queryKey: ['preview'], queryFn: () => null }),
  uploadDocumentFileMutation: () => ({ mutationFn: () => Promise.resolve({}) }),
  deleteDocumentFileMutation: () => ({ mutationFn: () => Promise.resolve() }),
  submitAccountRequestMutation: () => ({ mutationFn: mocks.submit }),
}));

const { SignatureStep } = await import('..');

const ID = 'req-1';

const item = (
  id: string,
  extra: Record<string, unknown> = {},
  signed = false,
) => ({
  item_id: id,
  label: `Form ${id}`,
  description: `About ${id}`,
  required: true,
  accepted_types: ['application/pdf'],
  max_size_bytes: 1024,
  template_url: `http://mock.test/__templates/${id}`,
  files:
    signed ?
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
  ...extra,
});

const GateProbe = () => {
  const gate = useStepGate();
  return (
    <>
      <span data-testid='gate'>{gate.canContinue ? 'open' : 'closed'}</span>
      <span data-testid='label'>{gate.nextLabel}</span>
      <button
        type='button'
        onClick={() => {
          void gate.run().then((ran) => {
            mocks.ran.value = ran;
          });
        }}
      >
        run
      </button>
    </>
  );
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

const renderStep = (bank: Record<string, unknown>) => {
  mocks.bank.value = bank;
  return render(<SignatureStep requestId={ID} />, { wrapper });
};

const phases = es.Signature.phases;

describe('SignatureStep', () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.success.mockClear();
    mocks.warning.mockClear();
    mocks.error.mockClear();
    mocks.submit.mockReset();
    mocks.ran.value = undefined;
  });

  it('says what is missing while locked and points back to the documents', async () => {
    renderStep({ phase: 'locked', items: [] });

    expect(await screen.findByText(phases.locked.title)).toBeDefined();
    expect(
      screen.getByText(es.Signature.milestones.received.title),
    ).toBeDefined();
    expect(screen.queryByText(phases.locked.label)).toBeNull();
    expect(screen.getByTestId('gate').textContent).toBe('closed');

    fireEvent.click(
      screen.getByRole('button', { name: es.Signature.goToChecklist }),
    );

    expect(mocks.push).toHaveBeenCalledWith(`/${ID}/document-checklist`);
  });

  it('shows the bank reviewing, with no way out and no cards', async () => {
    renderStep({ phase: 'in_review', items: [] });

    expect(await screen.findByText(phases.in_review.title)).toBeDefined();
    // The milestones say where it stands: no status label on top.
    expect(screen.queryByText(phases.in_review.label)).toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: es.Signature.goToChecklist }),
    ).toBeNull();
  });

  it('lists the documents to download, sign and upload once they are published', async () => {
    renderStep({
      phase: 'available',
      items: [item('form-a'), item('form-b', {}, true)],
    });

    expect(await screen.findByText('Form form-a')).toBeDefined();
    const downloads = screen.getAllByRole('link', {
      name: es.BaseDocuments.upload.downloadTemplate,
    });

    expect(downloads.map((link) => link.getAttribute('href'))).toEqual([
      'http://mock.test/__templates/form-a',
      'http://mock.test/__templates/form-b',
    ]);
    expect(screen.getByTestId('gate').textContent).toBe('closed');
    expect(screen.getByText(phases.available.label)).toBeDefined();
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith({
      heading: phases.available.title,
      description: es.Signature.arrival.available,
    });
  });

  it('opens finish, labelled for the step, once every document is returned signed', async () => {
    renderStep({
      phase: 'available',
      items: [item('form-a', {}, true), item('form-b', {}, true)],
    });

    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });
    expect(screen.getByTestId('label').textContent).toBe(
      es.Signature.footer.finish,
    );
  });

  it('shows the reason of a returned document and keeps finish closed until it is uploaded again', async () => {
    renderStep({
      phase: 'returned',
      items: [item('form-b', { rejection_reason: 'Signature out of frame' })],
    });

    expect(await screen.findByText('Signature out of frame')).toBeDefined();
    expect(screen.getAllByText(phases.returned.detail)).not.toHaveLength(0);
    expect(screen.getByTestId('gate').textContent).toBe('closed');
    expect(mocks.warning).toHaveBeenCalledOnce();
  });

  it('keeps finish closed when the published list is empty', async () => {
    renderStep({ phase: 'available', items: [] });

    await screen.findByText(phases.available.title);

    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });

  it('submits the request on finish and goes on only when the bank took it', async () => {
    renderStep({ phase: 'available', items: [item('form-a', {}, true)] });
    await waitFor(() => {
      expect(screen.getByTestId('gate').textContent).toBe('open');
    });

    mocks.submit.mockResolvedValueOnce({ status: 'submitted' });
    fireEvent.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => {
      expect(mocks.ran.value).toBe(true);
    });

    mocks.submit.mockRejectedValueOnce(new Error('422'));
    fireEvent.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => {
      expect(mocks.ran.value).toBe(false);
    });
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith({
      heading: es.Signature.submitFailed.title,
      description: es.Signature.submitFailed.description,
    });
  });
});
