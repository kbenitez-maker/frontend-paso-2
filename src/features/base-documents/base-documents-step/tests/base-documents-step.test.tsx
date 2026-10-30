import { useState } from 'react';

import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '@lafise/lde-web-lib';

import { StepGateProvider, useStepGate } from '@/shared/request/step-gate';
import { es, render, screen } from '@/test/render';

interface TestFile {
  file_id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

interface TestItem {
  item_id: string;
  label: string;
  description: string;
  required: boolean;
  accepted_types: string[];
  max_size_bytes: number;
  files: TestFile[];
}

const mocks = vi.hoisted(() => ({
  checklist: { value: { stage: 'base', items: [] as unknown[] } },
  upload: vi.fn<(itemId: string, body: FormData) => unknown>(),
  remove: vi.fn<(itemId: string, fileId: string) => unknown>(),
  calls: [] as string[],
}));

vi.mock('@/server/api', () => ({
  documentChecklistQuery: (requestId: string, stage: string) => ({
    queryKey: ['account-requests', requestId, 'document-checklist', stage],
    queryFn: () => Promise.resolve(structuredClone(mocks.checklist.value)),
  }),
  filePreviewQuery: (_request: string, _item: string, fileId: string) => ({
    queryKey: ['preview', fileId],
    queryFn: () =>
      Promise.resolve({
        url: `http://files.test/${fileId}`,
        expires_at: '2099-01-01T00:00:00.000Z',
      }),
  }),
  uploadDocumentFileMutation: (
    _request: string,
    itemId: string,
    onProgress?: (fraction: number) => void,
  ) => ({
    mutationFn: (body: FormData) => {
      onProgress?.(0.5);
      mocks.calls.push(`upload:${itemId}`);
      const result = mocks.upload(itemId, body);
      return result instanceof Error ?
          Promise.reject(result)
        : Promise.resolve(result);
    },
  }),
  deleteDocumentFileMutation: (_request: string, itemId: string) => ({
    mutationFn: (fileId: string) => {
      mocks.calls.push(`remove:${fileId}`);
      mocks.remove(itemId, fileId);
      return Promise.resolve();
    },
  }),
}));

const toastError = vi.hoisted(() => vi.fn<(message: unknown) => void>());

vi.mock('@lafise/onyx-ui/status/toast', () => ({
  toast: { error: toastError },
}));

const { BaseDocumentsStep } = await import('..');

const MB = 1024 * 1024;

const item = (id: string, files: TestFile[] = []): TestItem => ({
  item_id: id,
  label: `Document ${id}`,
  description: `Description ${id}`,
  required: true,
  accepted_types: ['application/pdf', 'image/jpeg', 'image/png'],
  max_size_bytes: 25 * MB,
  files,
});

const stored = (id: string, name: string): TestFile => ({
  file_id: id,
  name,
  size_bytes: 2048,
  mime_type: 'image/png',
  uploaded_at: '2026-10-04T10:00:00.000Z',
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <StepGateProvider>{children}</StepGateProvider>
  </QueryClientProvider>
);

/** Stands in for the footer: shows the label and whether "Continue" is open. */
const FooterProbe = () => {
  const gate = useStepGate();
  const [result, setResult] = useState('idle');

  return (
    <>
      <span data-testid='gate'>{gate.canContinue ? 'open' : 'closed'}</span>
      <span data-testid='label'>{gate.nextLabel}</span>
      <span data-testid='result'>{result}</span>
      <button
        type='button'
        onClick={() => {
          void gate.run().then((ok) => {
            setResult(ok ? 'continued' : 'stayed');
          });
        }}
      >
        continue
      </button>
    </>
  );
};

const renderStep = (items: TestItem[]) => {
  mocks.checklist.value = { stage: 'base', items };
  return render(
    <>
      <BaseDocumentsStep requestId='r1' />
      <FooterProbe />
    </>,
    { wrapper },
  );
};

const gate = () => screen.getByTestId('gate').textContent;

const inputOf = (index: number): HTMLInputElement => {
  const input = document.querySelectorAll('input[type=file]').item(index);
  if (!(input instanceof HTMLInputElement)) throw new Error('missing input');
  return input;
};

const pick = (index: number, file: File) => {
  fireEvent.change(inputOf(index), { target: { files: [file] } });
};

const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' });

describe('BaseDocumentsStep', () => {
  beforeEach(() => {
    mocks.upload.mockReset();
    mocks.remove.mockReset();
    mocks.calls.length = 0;
    toastError.mockReset();
  });

  it('renders one card per item of the checklist with its limits', async () => {
    renderStep([item('a'), item('b'), item('c')]);

    expect(await screen.findByText('Document a')).toBeDefined();
    expect(screen.getByText('Document b')).toBeDefined();
    expect(screen.getByText('Document c')).toBeDefined();
    expect(screen.getByText('Description a')).toBeDefined();
    expect(screen.getAllByText('PDF, JPG o PNG · máx. 25 MB')).toHaveLength(3);
    expect(
      screen.getByText(
        es.BaseDocuments.card.descriptionPending.replace('{count}', '3'),
      ),
    ).toBeDefined();
  });

  it('follows the checklist of the request (another country, another list)', async () => {
    renderStep([item('x'), item('y')]);

    expect(await screen.findByText('Document x')).toBeDefined();
    expect(screen.queryByText('Document c')).toBeNull();
    expect(
      screen.getByText(
        es.BaseDocuments.card.descriptionPending.replace('{count}', '2'),
      ),
    ).toBeDefined();
  });

  it('keeps Continue closed until every required item has a file', async () => {
    renderStep([item('a', [stored('f1', 'a.png')]), item('b')]);
    await screen.findByText('Document b');

    expect(gate()).toBe('closed');
    expect(screen.getByTestId('label').textContent).toBe(
      es.BaseDocuments.footer.next,
    );
  });

  it('opens Continue once every required item has a file', async () => {
    renderStep([
      item('a', [stored('f1', 'a.png')]),
      item('b', [stored('f2', 'b.png')]),
    ]);

    await waitFor(() => {
      expect(gate()).toBe('open');
    });
    expect(
      screen.getByText(es.BaseDocuments.card.descriptionComplete),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'continue' }));
    expect(await screen.findByText('continued')).toBeDefined();
  });

  it('does not require an optional item', async () => {
    renderStep([
      item('a', [stored('f1', 'a.png')]),
      { ...item('b'), required: false },
    ]);

    await waitFor(() => {
      expect(gate()).toBe('open');
    });
  });

  it('rejects a file of the wrong format without sending it', async () => {
    renderStep([item('a')]);
    await screen.findByText('Document a');

    pick(0, new File(['x'], 'nota.txt', { type: 'text/plain' }));

    expect(
      await screen.findByText(
        'El archivo no cumple con el formato o tamaño permitido (Máximo 25MB en PDF, JPG o PNG). Asegúrese de que el documento sea legible.',
      ),
    ).toBeDefined();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit without sending it', async () => {
    renderStep([item('a')]);
    await screen.findByText('Document a');
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 25 * MB + 1 });

    pick(0, big);

    expect(
      await screen.findByText(/El archivo no cumple con el formato o tamaño/),
    ).toBeDefined();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('uploads a valid file as multipart `file` and shows it once stored', async () => {
    mocks.upload.mockImplementation((itemId, body) => {
      const file = body.get('file');
      const name = file instanceof File ? file.name : '';
      mocks.checklist.value = {
        stage: 'base',
        items: [item(itemId, [stored('f1', name)])],
      };
      return stored('f1', name);
    });
    renderStep([item('a')]);
    await screen.findByText('Document a');

    pick(0, png('escritura.png'));

    expect(await screen.findByText('escritura.png')).toBeDefined();
    const body = mocks.upload.mock.calls[0]?.[1];
    expect(body?.get('file')).toBeInstanceOf(File);
    await waitFor(() => {
      expect(gate()).toBe('open');
    });
  });

  it('replaces by uploading the new file first and then removing the old one', async () => {
    mocks.upload.mockReturnValue(stored('f2', 'new.png'));
    renderStep([item('a', [stored('f1', 'old.png')])]);
    await screen.findByText('old.png');

    pick(0, png('new.png'));

    await waitFor(() => {
      expect(mocks.calls).toEqual(['upload:a', 'remove:f1']);
    });
  });

  it('keeps the old file when the replacement fails', async () => {
    mocks.upload.mockReturnValue(
      HttpException.fromResponseData(500, {
        error: { code: 'HTTP_500', message: 'boom' },
      }),
    );
    renderStep([item('a', [stored('f1', 'old.png')])]);
    await screen.findByText('old.png');

    pick(0, png('new.png'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith({
        heading: es.BaseDocuments.errors.uploadFailed.title,
        description: es.BaseDocuments.errors.uploadFailed.description,
      });
    });
    expect(mocks.calls).toEqual(['upload:a']);
    expect(screen.getByText('old.png')).toBeDefined();
  });

  it('shows the format message when the server refuses the file (415)', async () => {
    mocks.upload.mockReturnValue(
      HttpException.fromResponseData(415, {
        error: { code: 'FILE_FORMAT_NOT_ALLOWED', message: 'no' },
      }),
    );
    renderStep([item('a')]);
    await screen.findByText('Document a');

    pick(0, png());

    expect(
      await screen.findByText(/El archivo no cumple con el formato o tamaño/),
    ).toBeDefined();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('removes a file from its card', async () => {
    renderStep([item('a', [stored('f1', 'a.png')])]);
    await screen.findByText('a.png');

    fireEvent.click(
      screen.getByRole('button', {
        name: es.BaseDocuments.upload.remove.replace('{name}', 'Document a'),
      }),
    );

    await waitFor(() => {
      expect(mocks.remove).toHaveBeenCalledWith('a', 'f1');
    });
  });

  it('opens the preview of an uploaded file from its short-lived URL', async () => {
    renderStep([item('a', [stored('f1', 'a.png')])]);
    const preview = await screen.findByRole('button', {
      name: es.BaseDocuments.upload.preview.replace('{name}', 'Document a'),
    });
    // The button opens once the thumbnail's URL is known.
    await waitFor(() => {
      expect(preview.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(preview);

    const dialog = await screen.findByRole('dialog', { hidden: true });
    await waitFor(() => {
      expect(dialog.querySelector('img')?.getAttribute('src')).toBe(
        'http://files.test/f1',
      );
    });
  });
});
