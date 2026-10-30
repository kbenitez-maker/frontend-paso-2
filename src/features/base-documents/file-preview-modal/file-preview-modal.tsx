'use client';

import type { FilePreviewModalProps } from './types';

import { useTranslations } from 'next-intl';

import { Modal } from '@lafise/onyx-ui/overlays/modal';

import { PreviewBody } from './preview-body';
import { filePreviewModalTheme } from './themes';

const { dialog, header } = filePreviewModalTheme();

/** Preview of an uploaded document (PDF or image), as the POC's preview modal. */
const FilePreviewModalRoot = ({
  requestId,
  target,
  onClose,
}: Readonly<FilePreviewModalProps>) => {
  const t = useTranslations('BaseDocuments.preview');

  return (
    <Modal
      isOpen={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      aria-label={t('label')}
      dialogProps={{ className: dialog() }}
    >
      <Modal.Header className={header()}>
        <Modal.Headline>
          <Modal.Title size='sm'>{target?.file.name ?? ''}</Modal.Title>
        </Modal.Headline>
        <Modal.Slot>
          <Modal.CloseButton />
        </Modal.Slot>
      </Modal.Header>

      <Modal.Body>
        {target === null ? null : (
          <PreviewBody requestId={requestId} target={target} />
        )}
      </Modal.Body>
    </Modal>
  );
};

export { FilePreviewModalRoot };
