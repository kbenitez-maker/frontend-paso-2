'use client';

import { useRef, useState } from 'react';

import type { DocumentChecklistItem } from '@/server/api';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { HttpException } from '@lafise/lde-web-lib';
import { toast } from '@lafise/onyx-ui/status/toast';

import { queryKeys } from '@/lib/constants/query-keys';
import {
  deleteDocumentFileMutation,
  uploadDocumentFileMutation,
} from '@/server/api';

import {
  isRejection,
  megabytesOf,
  remainingSeconds,
  validateFile,
} from '../lib/file-rules';

/** What is being sent right now: real transport progress, never simulated. */
interface UploadProgress {
  name: string;
  bytes: number;
  /** Fraction sent, 0 to 1. */
  fraction: number;
  /** Estimate from the real rate; `undefined` before anything was sent. */
  remainingSeconds: number | undefined;
}

interface UseItemUploadOptions {
  requestId: string;
  item: DocumentChecklistItem;
  /** Accepted type labels as the copy names them, e.g. `PDF, JPG o PNG`. */
  typesLabel: string;
}

/**
 * Uploads, replaces and removes the files of one checklist item. A file is
 * checked against the item's limits before it is sent; the server checks
 * again. Replacing uploads the new file first and only then removes the old
 * one, so a failed upload loses nothing.
 */
const useItemUpload = ({
  requestId,
  item,
  typesLabel,
}: UseItemUploadOptions) => {
  const t = useTranslations('BaseDocuments.errors');
  const client = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | undefined>();
  const startedAtRef = useRef(0);

  const rejectionCopy = t('invalidFile', {
    mb: megabytesOf(item.max_size_bytes),
    types: typesLabel,
  });

  const upload = useMutation(
    uploadDocumentFileMutation(requestId, item.item_id, (fraction) => {
      setProgress((current) =>
        current === null ? current : (
          {
            ...current,
            fraction,
            remainingSeconds: remainingSeconds(
              Date.now() - startedAtRef.current,
              fraction,
            ),
          }
        ),
      );
    }),
  );
  const remove = useMutation(
    deleteDocumentFileMutation(requestId, item.item_id),
  );

  const refreshChecklist = () =>
    client.invalidateQueries({
      queryKey: queryKeys.accountRequests.documents(requestId),
    });

  const removeFile = async (fileId: string) => {
    try {
      await remove.mutateAsync(fileId);
      await refreshChecklist();
    } catch {
      toast.error({
        heading: t('removeFailed.title'),
        description: t('removeFailed.description'),
      });
    }
  };

  const receive = async (file: File) => {
    if (validateFile(file, item) !== undefined) {
      setError(rejectionCopy);
      return;
    }
    setError(undefined);
    const previous = item.files.at(-1);
    startedAtRef.current = Date.now();
    setProgress({
      name: file.name,
      bytes: file.size,
      fraction: 0,
      remainingSeconds: undefined,
    });

    try {
      const body = new FormData();
      body.append('file', file);
      await upload.mutateAsync(body);
      if (previous !== undefined) await remove.mutateAsync(previous.file_id);
      await refreshChecklist();
    } catch (error_) {
      if (error_ instanceof HttpException && isRejection(error_.status)) {
        setError(rejectionCopy);
      } else {
        toast.error({
          heading: t('uploadFailed.title'),
          description: t('uploadFailed.description'),
        });
      }
    } finally {
      setProgress(null);
    }
  };

  return {
    progress,
    error,
    receive,
    removeFile,
    isBusy: progress !== null || remove.isPending,
  };
};

export { useItemUpload, type UploadProgress, type UseItemUploadOptions };
