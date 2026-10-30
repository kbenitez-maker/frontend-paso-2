import type { Inquiry } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

const mocks = vi.hoisted(() => ({
  pathname: vi.fn<() => string>(),
  send: vi.fn<(body: unknown) => void>(),
  inquiries: { value: [] as Inquiry[] },
}));

vi.mock('next/navigation', () => ({ usePathname: mocks.pathname }));

vi.mock('@/server/api', () => ({
  inquiriesQuery: (requestId: string) => ({
    queryKey: ['account-requests', requestId, 'inquiries'],
    queryFn: () => Promise.resolve(mocks.inquiries.value),
  }),
  createInquiryMutation: () => ({
    mutationFn: (body: object) => {
      mocks.send(body);
      return Promise.resolve({});
    },
  }),
}));

const { HelpButton } = await import('..');

const ID = 'req-1';
const copy = es.Steps;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const open = () => {
  const trigger = screen.getByRole('button', { name: copy.footer.help });
  fireEvent.click(trigger);
  return trigger;
};

describe('HelpButton', () => {
  beforeEach(() => {
    mocks.send.mockReset();
    mocks.pathname.mockReturnValue(`/${ID}/company`);
    mocks.inquiries.value = [];
  });

  it('opens and closes a dialog labelled by its trigger', async () => {
    render(<HelpButton requestId={ID} />, { wrapper });

    const trigger = open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(
      await screen.findByRole('dialog', { name: copy.footer.help }),
    ).toBeDefined();
    expect(screen.getByText(copy.help.ask)).toBeDefined();
    expect(
      screen.getByRole('button', { name: copy.help.whatsapp }),
    ).toBeDefined();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('asks for the text before sending', async () => {
    render(<HelpButton requestId={ID} />, { wrapper });
    open();

    fireEvent.click(
      await screen.findByRole('button', { name: copy.help.send }),
    );

    expect(await screen.findByText(copy.help.empty)).toBeDefined();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends the text with the step on screen and confirms it', async () => {
    render(<HelpButton requestId={ID} />, { wrapper });
    open();

    fireEvent.change(await screen.findByRole('textbox'), {
      target: { value: '  ¿Qué documento equivale al RNC?  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.help.send }));

    await waitFor(() => {
      expect(mocks.send).toHaveBeenCalledWith({
        step: 'company',
        text: '¿Qué documento equivale al RNC?',
      });
    });
    expect(
      await screen.findByText(
        copy.help.sentFrom.replace('{step}', copy.company.title),
      ),
    ).toBeDefined();
  });

  it('lists the earlier inquiries with author, text and origin step', async () => {
    mocks.inquiries.value = [
      {
        inquiry_id: 'q1',
        step: 'bancanet',
        text: 'Mi duda anterior',
        author: 'applicant',
        created_at: '2026-10-03T15:30:00.000Z',
      },
      {
        inquiry_id: 'q2',
        step: null,
        text: 'Respuesta del Oficial',
        author: 'officer',
        created_at: '2026-10-03T16:00:00.000Z',
      },
    ];
    render(<HelpButton requestId={ID} />, { wrapper });
    await waitFor(() => {
      expect(mocks.inquiries.value).toHaveLength(2);
    });
    open();

    expect(await screen.findByText('Mi duda anterior')).toBeDefined();
    expect(screen.getByText('Respuesta del Oficial')).toBeDefined();
    expect(screen.getByText(copy.help.applicant)).toBeDefined();
    expect(screen.getByText(copy.help.officer)).toBeDefined();
    expect(
      screen.getByText(copy.help.from.replace('{step}', copy.bancanet.title)),
    ).toBeDefined();
    expect(screen.getByText(copy.help.another)).toBeDefined();
  });

  it('is only a button when there is no request yet', () => {
    render(<HelpButton />, { wrapper });
    open();

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
