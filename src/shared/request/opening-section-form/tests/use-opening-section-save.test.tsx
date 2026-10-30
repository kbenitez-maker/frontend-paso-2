import type { OpeningCurrentSection } from '@/server/api';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '@lafise/lde-web-lib';
import { ToastProvider } from '@lafise/onyx-ui';
import { toast } from '@lafise/onyx-ui/status/toast';

import { OPENING_COMPANY_STEP } from '@/lib/opening';
import {
  AutosaveProvider,
  useAutosaveState,
} from '@/shared/request/autosave-state';
import { NextIntlClientTestWrapper } from '@/test/next-intl';
import { openingApi, resetOpeningApi } from '@/test/opening-sections';
import { es } from '@/test/render';

import { useOpeningSectionSave } from '../use-opening-section-save';

vi.mock('@/server/api', async () =>
  (await import('@/test/opening-sections')).openingQueries(),
);

const section: OpeningCurrentSection = {
  step_code: 'company',
  section_code: 'identification',
  display_name: 'Información requerida de la empresa',
  display_order: 1,
  values: {},
  fields: [
    {
      code: 'legal_name',
      display_name: 'Razón social',
      field_type: 'text',
      is_required: true,
      display_order: 1,
    },
    {
      code: 'trade_name',
      display_name: 'Nombre comercial',
      field_type: 'text',
      is_required: true,
      display_order: 2,
    },
  ],
};

const filled = { legal_name: 'Empresa S.A.', trade_name: 'Empresa' };

const answerKey = ['opening-answer', 'r1', 'company'];

const setup = (
  defaultValues: Record<string, unknown> = filled,
  previewBank?: string,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientTestWrapper>
      <QueryClientProvider client={client}>
        <AutosaveProvider>
          {children}
          <ToastProvider />
        </AutosaveProvider>
      </QueryClientProvider>
    </NextIntlClientTestWrapper>
  );
  const rendered = renderHook(
    () => {
      const form = useForm<Record<string, unknown>>({ defaultValues });
      const save = useOpeningSectionSave({
        requestId: 'r1',
        stepCode: OPENING_COMPANY_STEP,
        previewBank,
        section,
        form,
        bankId: 'BLPA',
        country: 'PA',
      });
      return { form, save, autosave: useAutosaveState() };
    },
    { wrapper },
  );
  return { client, ...rendered };
};

const continueSection = async (
  result: ReturnType<typeof setup>['result'],
): Promise<boolean> => {
  let continued = false;
  await act(async () => {
    continued = await result.current.save.continueSection();
  });
  return continued;
};

describe('useOpeningSectionSave', { concurrent: false }, () => {
  beforeEach(() => {
    resetOpeningApi();
  });

  afterEach(() => {
    toast.dismiss();
    vi.useRealTimers();
  });

  it('saves the section under its code and lets the footer continue', async () => {
    openingApi.payload = { contact: { company_email: 'info@empresa.com' } };
    const { result, client } = setup();

    expect(await continueSection(result)).toBe(true);
    expect(openingApi.put).toHaveBeenCalledWith(
      {
        payload: {
          contact: { company_email: 'info@empresa.com' },
          identification: filled,
        },
        completed_at: null,
      },
      expect.anything(),
    );
    expect(openingApi.lastAnswerQuery).toEqual({
      step: 'company',
      bank: undefined,
    });
    expect(client.getQueryData(answerKey)).toMatchObject({
      payload: { identification: filled },
    });
    expect(result.current.autosave.status).toBe('saved');
  });

  it('reads the answer again before the PUT instead of trusting the cache', async () => {
    const { result, client } = setup();
    client.setQueryDefaults(answerKey, { staleTime: Infinity });
    client.setQueryData(answerKey, {
      payload: { stale: { kept: false } },
      completed_at: null,
    });
    openingApi.payload = { contact: { company_email: 'fresh@empresa.com' } };

    await continueSection(result);

    expect(openingApi.answer).toHaveBeenCalledTimes(1);
    expect(openingApi.put).toHaveBeenCalledWith(
      {
        payload: {
          contact: { company_email: 'fresh@empresa.com' },
          identification: filled,
        },
        completed_at: null,
      },
      expect.anything(),
    );
  });

  it('writes the first answer when the API has none yet', async () => {
    openingApi.answer.mockResolvedValueOnce({});
    const { result } = setup();

    expect(await continueSection(result)).toBe(true);
    expect(openingApi.put).toHaveBeenCalledWith(
      { payload: { identification: filled }, completed_at: null },
      expect.anything(),
    );
  });

  it('does not read or write while a local preview bank is set', async () => {
    const { result } = setup(filled, 'BLCR');

    expect(await continueSection(result)).toBe(true);
    expect(openingApi.answer).not.toHaveBeenCalled();
    expect(openingApi.put).not.toHaveBeenCalled();
    expect(openingApi.lastAnswerQuery).toBeUndefined();
  });

  it('stops on empty required fields without saving', async () => {
    const { result } = setup({ legal_name: 'Empresa S.A.' });

    expect(await continueSection(result)).toBe(false);
    expect(result.current.form.getFieldState('trade_name').error?.type).toBe(
      'required',
    );
    expect(
      result.current.form.getFieldState('legal_name').error,
    ).toBeUndefined();
    expect(openingApi.put).not.toHaveBeenCalled();
  });

  it('reports a failed save, shows the toast and stays put', async () => {
    openingApi.put.mockRejectedValueOnce(new Error('network down'));
    const { result } = setup();

    expect(await continueSection(result)).toBe(false);
    expect(result.current.autosave.status).toBe('error');
    expect(result.current.save.isPending).toBe(false);
    expect(
      await screen.findByText(es.Form.saveFailed.description),
    ).toBeDefined();
  });

  it('does not autosave when a field error is set without a new answer', async () => {
    vi.useFakeTimers();
    const { result } = setup();

    act(() => {
      result.current.form.setError('legal_name', {
        type: 'server',
        message: 'DUPLICATED',
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(openingApi.put).not.toHaveBeenCalled();
  });

  it('explains a rejection when none of the fields are on screen', async () => {
    vi.useFakeTimers();
    openingApi.put.mockRejectedValueOnce(
      HttpException.fromResponseData(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          data: {
            field_errors: [
              {
                field: 'other_section_field',
                code: 'INVALID',
                message: 'Invalid',
              },
            ],
          },
        },
      }),
    );
    const { result } = setup();

    expect(await continueSection(result)).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(
      screen.getByText(es.Form.hiddenFieldError.description),
    ).toBeDefined();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(openingApi.put).toHaveBeenCalledTimes(1);
  });

  it('marks the fields the API rejected, without a toast', async () => {
    openingApi.put.mockRejectedValueOnce(
      HttpException.fromResponseData(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          data: {
            field_errors: [
              {
                field: 'legal_name',
                code: 'DUPLICATED',
                message: 'Duplicated',
              },
            ],
          },
        },
      }),
    );
    const { result } = setup();

    expect(await continueSection(result)).toBe(false);
    expect(result.current.form.getFieldState('legal_name').error).toEqual(
      expect.objectContaining({ type: 'server', message: 'DUPLICATED' }),
    );
    expect(screen.queryByText(es.Form.saveFailed.description)).toBeNull();
  });

  it('does not save again when the API rejects a field', async () => {
    vi.useFakeTimers();
    openingApi.put.mockRejectedValueOnce(
      HttpException.fromResponseData(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          data: {
            field_errors: [
              {
                field: 'legal_name',
                code: 'DUPLICATED',
                message: 'Duplicated',
              },
            ],
          },
        },
      }),
    );
    const { result } = setup();

    expect(await continueSection(result)).toBe(false);
    expect(result.current.form.getFieldState('legal_name').error?.type).toBe(
      'server',
    );
    expect(screen.queryByText(es.Form.saveFailed.description)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(openingApi.put).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(es.Form.saveFailed.description)).toBeNull();
  });

  it('autosaves an edit after the pause', async () => {
    vi.useFakeTimers();
    const { result } = setup();

    act(() => {
      result.current.form.setValue('trade_name', 'Nueva');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(openingApi.put).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await vi.waitFor(() => {
      expect(openingApi.put).toHaveBeenCalledWith(
        {
          payload: { identification: { ...filled, trade_name: 'Nueva' } },
          completed_at: null,
        },
        expect.anything(),
      );
    });
  });

  it('keeps autosaving an edit when Continue stops on an empty required field', async () => {
    vi.useFakeTimers();
    const { result } = setup({ legal_name: '' });

    act(() => {
      result.current.form.setValue('trade_name', 'Empresa');
    });
    expect(await continueSection(result)).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    await vi.waitFor(() => {
      expect(openingApi.put).toHaveBeenCalledWith(
        {
          payload: {
            identification: { legal_name: '', trade_name: 'Empresa' },
          },
          completed_at: null,
        },
        expect.anything(),
      );
    });
  });

  it('does not retry a save when the stored payload is not an object', async () => {
    vi.useFakeTimers();
    openingApi.answer.mockImplementation(() =>
      Promise.resolve({ payload: [], completed_at: null }),
    );
    const { result } = setup();

    expect(await continueSection(result)).toBe(false);
    expect(openingApi.put).not.toHaveBeenCalled();
    expect(openingApi.answer).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByText(es.Form.saveFailed.description)).toBeDefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(openingApi.answer).toHaveBeenCalledTimes(1);
    expect(openingApi.put).not.toHaveBeenCalled();
  });

  it('retries the pending edits after a failed Continue', async () => {
    vi.useFakeTimers();
    openingApi.put.mockRejectedValueOnce(new Error('network down'));
    const { result } = setup();

    expect(await continueSection(result)).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    await vi.waitFor(() => {
      expect(openingApi.put).toHaveBeenCalledTimes(2);
    });
  });
});
