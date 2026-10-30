import type { DocumentStage } from '@/types/request';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { HttpInternal } from '@/lib/http-internal';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/** A file uploaded to a checklist item. */
interface DocumentFile {
  file_id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

/**
 * Group of the `checklist` stage a document is listed under. The legal
 * documents split by who they identify: the company (`legal`) or the people
 * registered in related parties, by their role (POC blocks).
 */
type DocumentCategory =
  | 'legal'
  | 'representatives'
  | 'board'
  | 'shareholders'
  | 'fiduciaries'
  | 'financial'
  | 'regulatory';

/** One document the request asks for, with what the applicant already attached. */
interface DocumentChecklistItem {
  item_id: string;
  label: string;
  description?: string;
  required: boolean;
  /** MIME types the item accepts. */
  accepted_types: string[];
  max_size_bytes: number;
  files: DocumentFile[];
  /** Heading the document is grouped under, when the list has several groups. */
  category?: DocumentCategory;
  /** Blank or prefilled form to download, sign and upload back in the same item. */
  template_url?: string;
  /** Why the bank sent the document back; present until the applicant uploads it again. */
  rejection_reason?: string;
  /** Delivered in the profiling: listed read-only in the checklist and counted as complete. */
  from_profile?: boolean;
}

/** Documents the request must attach in a stage, decided by country and legal entity type. */
interface DocumentChecklist {
  stage: DocumentStage;
  items: DocumentChecklistItem[];
}

/** Short-lived URL that serves the bytes of an uploaded file. */
interface FilePreview {
  url: string;
  expires_at: string;
}

/** Fraction sent (0 to 1) from the transport's progress event; `undefined` when it has no total. */
const uploadFraction = (event: unknown): number | undefined => {
  if (typeof event !== 'object' || event === null) return undefined;
  const loaded: unknown = Reflect.get(event, 'loaded');
  const total: unknown = Reflect.get(event, 'total');
  if (typeof loaded !== 'number' || typeof total !== 'number' || total <= 0) {
    return undefined;
  }
  return Math.min(loaded / total, 1);
};

const documentChecklistQuery = (requestId: string, stage: DocumentStage) =>
  queryAdapter.query<DocumentChecklist>({
    queryKey: queryKeys.accountRequests.documentChecklist(requestId, stage),
    url: endpoints.accountRequests.documentChecklist(requestId),
    options: { apiVersion: APIVersion.V1, params: { stage } },
  });

/**
 * Uploads one file as multipart (`file` field). `onProgress` receives the
 * fraction sent, 0 to 1, from the transport's own upload events.
 */
const uploadDocumentFileMutation = (
  requestId: string,
  itemId: string,
  onProgress?: (fraction: number) => void,
) =>
  queryAdapter.mutation<DocumentFile, FormData>({
    url: endpoints.accountRequests.documentFiles(requestId, itemId),
    method: 'post',
    options: {
      apiVersion: APIVersion.V1,
      // The client defaults to JSON, which makes axios serialize a FormData as JSON.
      headers: { 'Content-Type': 'multipart/form-data' },
      ...(onProgress === undefined ?
        {}
      : {
          onUploadProgress: (event: unknown) => {
            const fraction = uploadFraction(event);
            if (fraction !== undefined) onProgress(fraction);
          },
        }),
    },
  });

/** Removes the file whose id is the mutation variable from the item. */
const deleteDocumentFileMutation = (requestId: string, itemId: string) => ({
  mutationFn: async (fileId: string): Promise<void> => {
    const result = await HttpInternal.delete(
      endpoints.accountRequests.documentFile(requestId, itemId, fileId),
      { apiVersion: APIVersion.V1 },
    );
    if (result.error) throw result.error;
  },
});

const filePreviewQuery = (requestId: string, itemId: string, fileId: string) =>
  queryAdapter.query<FilePreview>({
    queryKey: queryKeys.accountRequests.filePreview(requestId, itemId, fileId),
    url: endpoints.accountRequests.documentFilePreviewUrl(
      requestId,
      itemId,
      fileId,
    ),
    options: { apiVersion: APIVersion.V1 },
  });

export {
  deleteDocumentFileMutation,
  documentChecklistQuery,
  filePreviewQuery,
  uploadDocumentFileMutation,
  uploadFraction,
  type DocumentCategory,
  type DocumentChecklist,
  type DocumentChecklistItem,
  type DocumentFile,
  type FilePreview,
};
