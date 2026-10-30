'use client';

import { createContext, use } from 'react';

import type { DocumentChecklistItem, DocumentFile } from '@/server/api';
import type { UploadProgress } from './use-item-upload';

/** State of one upload card shared by its parts. */
interface UploadCardContextValue {
  item: DocumentChecklistItem;
  /** Latest file of the item, if any. */
  file: DocumentFile | undefined;
  /** What is being sent; `null` when nothing is. */
  progress: UploadProgress | null;
  /** Why the last attempt failed, if it did. */
  error: string | undefined;
  isBusy: boolean;
  /** Accepted formats and size limit, as the copy states them. */
  hint: string;
  /** Receives the file picked through a `FileTrigger`. */
  pick: (files: FileList | null) => void;
  remove: (fileId: string) => void;
}

const UploadCardContext = createContext<UploadCardContextValue | undefined>(
  undefined,
);

const useUploadCard = (): UploadCardContextValue => {
  const context = use(UploadCardContext);
  if (context === undefined) {
    throw new Error('useUploadCard must be used within an UploadCard');
  }
  return context;
};

export { UploadCardContext, useUploadCard, type UploadCardContextValue };
