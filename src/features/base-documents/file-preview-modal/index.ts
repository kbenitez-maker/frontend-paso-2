import { FilePreviewModalRoot } from './file-preview-modal';
import { PreviewBody } from './preview-body';

/** Preview modal of an uploaded document; `Body` draws the file. */
const FilePreviewModal = Object.assign(FilePreviewModalRoot, {
  Body: PreviewBody,
});

export { FilePreviewModal };
export type { FilePreviewModalProps, PreviewTarget } from './types';
