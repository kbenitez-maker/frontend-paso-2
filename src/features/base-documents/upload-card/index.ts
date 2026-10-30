import { DropZone } from './drop-zone';
import { FileFooter } from './file-footer';
import { FileThumbnail } from './file-thumbnail';
import { UploadCardRoot } from './upload-card';
import { UploadProgress } from './upload-progress';

/**
 * Upload card of one checklist item: `<UploadCard />` renders the whole card;
 * its parts read the upload state from context, except `Thumbnail`, which the
 * read-only profile card reuses with its own props.
 */
const UploadCard = Object.assign(UploadCardRoot, {
  DropZone,
  Progress: UploadProgress,
  Thumbnail: FileThumbnail,
  Footer: FileFooter,
});

export { UploadCard };
export type { UploadCardProps } from './upload-card';
