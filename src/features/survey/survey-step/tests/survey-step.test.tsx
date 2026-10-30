import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FlowFooter } from '@/shared/request/flow-footer';
import { StepGateProvider } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  push: vi.fn<(href: string) => void>(),
  send: vi.fn<(body: unknown) => Promise<unknown>>(),
  error: vi.fn<(toast: unknown) => void>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/req-1/survey',
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@lafise/onyx-ui/status/toast', () => ({
  toast: { error: mocks.error },
}));

vi.mock('@/shared/request/help-button', () => ({ HelpButton: () => null }));

vi.mock('@/server/api', () => ({
  createNpsResponseMutation: () => ({ mutationFn: mocks.send }),
}));

const { SurveyStep } = await import('..');

const t = es.Survey;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <StepGateProvider>
      {children}
      <FlowFooter requestId='req-1' />
    </StepGateProvider>
  </QueryClientProvider>
);

const renderStep = () => render(<SurveyStep requestId='req-1' />, { wrapper });

const send = () => screen.getByRole('button', { name: t.send });

describe('SurveyStep', () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.error.mockClear();
    mocks.send.mockReset();
  });

  it('asks the question and keeps send closed until a score is chosen', () => {
    renderStep();

    expect(screen.getByText(t.question)).toBeDefined();
    expect(screen.getByText(t.optional)).toBeDefined();
    expect(send().hasAttribute('disabled')).toBe(true);
  });

  it('words the open question by band and sends the score with the comment', async () => {
    mocks.send.mockResolvedValue({});
    renderStep();

    fireEvent.click(screen.getByRole('button', { name: '7' }));
    expect(screen.getByText(t.improve)).toBeDefined();
    expect(
      screen.getByText('Su respuesta nos llega como Neutro.'),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '9' }));
    expect(screen.getByText(t.liked)).toBeDefined();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: ' Muy ágil ' },
    });
    fireEvent.click(send());

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/req-1/submitted?rated=1');
    });
    expect(mocks.send.mock.calls[0]?.[0]).toEqual({
      score: 9,
      comment: 'Muy ágil',
    });
  });

  it('records a skip and goes on without the thanks', async () => {
    mocks.send.mockResolvedValue({});
    renderStep();

    fireEvent.click(screen.getByRole('button', { name: t.skip }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/req-1/submitted');
    });
    expect(mocks.send.mock.calls[0]?.[0]).toEqual({ skipped: true });
  });

  it('keeps the answer on screen when the send fails', async () => {
    mocks.send.mockRejectedValue(new Error('down'));
    renderStep();

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(send());

    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalledOnce();
    });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: '3' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
