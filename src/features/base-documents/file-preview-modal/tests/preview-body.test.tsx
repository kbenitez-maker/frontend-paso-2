import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { PDF_MIME } from '../../lib/file-rules';
import { PreviewBody } from '../preview-body';

const preview = vi.hoisted(() => ({
  state: {} as {
    url: string | undefined;
    isLoading: boolean;
    isError: boolean;
    retry: () => void;
  },
}));

vi.mock('../../lib/use-file-preview-url', () => ({
  useFilePreviewUrl: () => preview.state,
}));

const messages = es.BaseDocuments.preview;
const retry = vi.fn();

const target = (mime: string) => ({
  itemId: 'item-1',
  file: {
    file_id: 'f1',
    name: 'contract.pdf',
    mime_type: mime,
    size_bytes: 10,
    uploaded_at: '2026-10-07T10:00:00.000Z',
  },
});

describe('PreviewBody', () => {
  beforeEach(() => {
    retry.mockReset();
    preview.state = {
      url: 'https://files.test/f1',
      isLoading: false,
      isError: false,
      retry,
    };
  });

  it('offers a retry when the URL cannot be fetched', () => {
    preview.state = { ...preview.state, url: undefined, isError: true };
    render(<PreviewBody requestId='r1' target={target(PDF_MIME)} />);

    expect(screen.getByText(messages.unavailable)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: messages.retry }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('says it is loading while there is no URL yet', () => {
    preview.state = { ...preview.state, url: undefined, isLoading: true };
    render(<PreviewBody requestId='r1' target={target(PDF_MIME)} />);

    expect(screen.getByText(messages.loading)).toBeDefined();
  });

  it('draws a PDF in an object that falls back to a notice with the file name', () => {
    const { container } = render(
      <PreviewBody requestId='r1' target={target(PDF_MIME)} />,
    );

    const viewer = container.querySelector('object');
    expect(viewer?.getAttribute('data')).toBe('https://files.test/f1');
    expect(viewer?.getAttribute('aria-label')).toBe('contract.pdf');
    expect(
      screen.getByText(
        messages.pdfUnavailable.replace('{name}', 'contract.pdf'),
      ),
    ).toBeDefined();
  });

  it('draws any other file as an image', () => {
    render(<PreviewBody requestId='r1' target={target('image/png')} />);

    expect(screen.getByRole('img', { name: 'contract.pdf' })).toBeDefined();
  });
});
