import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { es, render, screen } from '@/test/render';

import { PDF_MIME } from '../../lib/file-rules';
import { FileThumbnail } from '../file-thumbnail';

const preview = vi.hoisted(() => ({ url: undefined as string | undefined }));

vi.mock('../../lib/use-file-preview-url', () => ({
  useFilePreviewUrl: () => ({ url: preview.url }),
}));

const file = (mime: string) => ({
  file_id: 'f1',
  name: 'doc',
  mime_type: mime,
  size_bytes: 10,
  uploaded_at: '2026-10-07T10:00:00.000Z',
});

const renderThumbnail = (mime: string, onPreview = vi.fn()) =>
  render(
    <FileThumbnail
      requestId='r1'
      itemId='i1'
      file={file(mime)}
      label='Contrato'
      onPreview={onPreview}
    />,
  );

describe('FileThumbnail', () => {
  beforeEach(() => {
    preview.url = 'https://files.test/f1';
  });

  it('draws a PDF in an object, with the notice naming it as its fallback', () => {
    const { container } = renderThumbnail(PDF_MIME);

    expect(container.querySelector('object')?.getAttribute('data')).toContain(
      'https://files.test/f1#toolbar=0',
    );
    expect(
      screen.getByText(
        es.BaseDocuments.upload.previewUnavailable.replace(
          '{name}',
          'Contrato',
        ),
      ),
    ).toBeDefined();
  });

  it('draws any other file as an image and opens the preview from its button', () => {
    const onPreview = vi.fn();
    const { container } = renderThumbnail('image/png', onPreview);

    expect(container.querySelector('img')).not.toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(onPreview).toHaveBeenCalledOnce();
  });

  it('shows an icon until the URL arrives', () => {
    preview.url = undefined;
    const { container } = renderThumbnail(PDF_MIME);

    expect(container.querySelector('object')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
