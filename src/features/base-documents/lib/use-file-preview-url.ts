'use client';

import { useQuery } from '@tanstack/react-query';

import { filePreviewQuery } from '@/server/api';

/** Short of the URL's own lifetime, so a cached one is never served expired. */
const PREVIEW_STALE_MS = 4 * 60 * 1000;

/**
 * The short-lived URL that serves an uploaded file. A failure never breaks the
 * page: the thumbnail falls back to an icon and the modal offers a retry.
 */
const useFilePreviewUrl = (
  requestId: string,
  itemId: string,
  fileId: string | undefined,
) => {
  const query = useQuery({
    ...filePreviewQuery(requestId, itemId, fileId ?? ''),
    enabled: fileId !== undefined,
    throwOnError: false,
    retry: false,
    staleTime: PREVIEW_STALE_MS,
  });

  return {
    url: query.data?.url,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
};

export { useFilePreviewUrl };
