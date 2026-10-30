import type { DocumentFile } from '@/server/api';

/** What the modal shows: one uploaded file of one checklist item. */
interface PreviewTarget {
  itemId: string;
  file: DocumentFile;
}

interface FilePreviewModalProps {
  requestId: string;
  target: PreviewTarget | null;
  onClose: () => void;
}

interface PreviewBodyProps {
  requestId: string;
  target: PreviewTarget;
}

export type { FilePreviewModalProps, PreviewBodyProps, PreviewTarget };
