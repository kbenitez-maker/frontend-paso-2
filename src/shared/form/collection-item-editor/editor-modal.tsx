'use client';

import type { ReactNode } from 'react';

import { Modal } from '@lafise/onyx-ui/overlays/modal';

import { collectionItemEditorTheme } from './themes';

const { dialog, header } = collectionItemEditorTheme();

interface EditorModalProps {
  title: string;
  onClose: () => void;
  /** Body, footer and any dialog over it. */
  children: ReactNode;
}

/** Modal of a top-level collection item. */
const EditorModal = ({
  title,
  onClose,
  children,
}: Readonly<EditorModalProps>) => (
  <Modal.Root
    isOpen
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <Modal dialogProps={{ className: dialog() }}>
      <Modal.Header className={header()}>
        <Modal.Headline>
          <Modal.Title size='sm'>{title}</Modal.Title>
        </Modal.Headline>
        <Modal.Slot>
          <Modal.CloseButton />
        </Modal.Slot>
      </Modal.Header>
      {children}
    </Modal>
  </Modal.Root>
);

export { EditorModal, type EditorModalProps };
