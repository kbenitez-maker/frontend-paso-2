import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  request: vi.fn(),
  progress: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth/server-auth-session', () => ({
  getServerAuthSession: () => Promise.resolve({ accessToken: 'token' }),
}));
vi.mock('@/server/api', () => ({
  getAccountRequest: mocks.request,
  getRequestProgress: mocks.progress,
}));

const { default: RequestPage } = await import('../page');

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

const open = () => RequestPage({ params: Promise.resolve({ requestId: ID }) });

const block = (key: string, completed: number, total: number) => ({
  key,
  completed_fields: completed,
  total_fields: total,
});

describe('[requestId] page', () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
    mocks.request.mockResolvedValue({ data: { editable: true } });
  });

  it('sends a request out of the applicant hands to its submitted screen', async () => {
    mocks.request.mockResolvedValue({ data: { editable: false } });

    await open();

    expect(mocks.redirect).toHaveBeenCalledWith(`/${ID}/submitted`);
    expect(mocks.progress).not.toHaveBeenCalled();
  });

  it('resumes at the first pending block of the first incomplete step', async () => {
    mocks.progress.mockResolvedValue({
      data: {
        percent: 40,
        steps: [
          {
            slug: 'company',
            state: 'complete',
            blocks: [block('identification', 3, 3)],
          },
          {
            slug: 'economic-activity',
            state: 'in_progress',
            blocks: [block('activity', 2, 2), block('tax-id', 0, 1)],
          },
        ],
      },
    });

    await open();

    expect(mocks.redirect).toHaveBeenCalledWith(
      `/${ID}/economic-activity?block=tax-id`,
    );
  });

  it('skips blocks that wait for an earlier one', async () => {
    mocks.progress.mockResolvedValue({
      data: {
        percent: 90,
        steps: [
          {
            slug: 'document-checklist',
            state: 'in_progress',
            blocks: [
              { ...block('legal-documents', 0, 2), waiting: true },
              block('confirm', 0, 1),
            ],
          },
        ],
      },
    });

    await open();

    expect(mocks.redirect).toHaveBeenCalledWith(
      `/${ID}/document-checklist?block=confirm`,
    );
  });

  it('resumes at the signature once every step is complete', async () => {
    mocks.progress.mockResolvedValue({
      data: {
        percent: 100,
        steps: [
          {
            slug: 'company',
            state: 'complete',
            blocks: [block('identification', 3, 3)],
          },
        ],
      },
    });

    await open();

    expect(mocks.redirect).toHaveBeenCalledWith(
      `/${ID}/signature?block=bank-documents`,
    );
  });
});
