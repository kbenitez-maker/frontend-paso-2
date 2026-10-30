import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FlowFooter } from '@/shared/request/flow-footer';
import { StepGateProvider } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  params: { value: new URLSearchParams() },
  request: { value: {} },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/req-1/submitted',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => mocks.params.value,
}));

vi.mock('@/shared/request/help-button', () => ({ HelpButton: () => null }));

vi.mock('@/server/api', () => ({
  accountRequestQuery: (requestId: string) => ({
    queryKey: ['account-requests', requestId],
    queryFn: () => Promise.resolve(mocks.request.value),
  }),
}));

const { SubmittedStep } = await import('..');

const t = es.Submitted;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <StepGateProvider>
      {children}
      <FlowFooter requestId='req-1' />
    </StepGateProvider>
  </QueryClientProvider>
);

const renderStep = (status: string, params = '') => {
  mocks.params.value = new URLSearchParams(params);
  Object.assign(mocks.request, {
    value: { request_number: 'SOL-0100', status },
  });
  return render(<SubmittedStep requestId='req-1' />, { wrapper });
};

describe('SubmittedStep', () => {
  beforeEach(() => {
    mocks.params.value = new URLSearchParams();
  });

  it('says what comes next, with the status and the request number', async () => {
    renderStep('submitted');

    expect(screen.getByText(t.title)).toBeDefined();
    expect(screen.getByText(t.next)).toBeDefined();
    expect(await screen.findByText(t.status.submitted)).toBeDefined();
    expect(
      screen.getByText('Solicitud SOL-0100 · 3 etapas por delante'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: t.goToRequests })).toBeDefined();
  });

  it('thanks the applicant who answered the survey', async () => {
    renderStep('bank_documents_generated', 'rated=1');

    expect(screen.getByText(t.thanks)).toBeDefined();
    expect(
      await screen.findByText(t.status.bank_documents_generated),
    ).toBeDefined();
  });
});
