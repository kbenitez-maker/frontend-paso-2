'use client';

import type { ReactNode } from 'react';

import { ChevronLeft } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Modal } from '@lafise/onyx-ui/overlays/modal';

import { collectionItemEditorTheme } from './themes';

const { panel, panelHeader } = collectionItemEditorTheme();

interface EditorPanelProps {
  title: string;
  backLabel: string;
  onClose: () => void;
  /** Body, footer and any dialog over it. */
  children: ReactNode;
}

/** A child item is edited in a panel over the parent modal (POC: navigation inwards, not a stacked modal). */
const EditorPanel = ({
  title,
  backLabel,
  onClose,
  children,
}: Readonly<EditorPanelProps>) => (
  <div className={panel()}>
    <Modal.Header className={panelHeader()}>
      <Button
        icon
        variant='plain'
        size='sm'
        aria-label={backLabel}
        onPress={onClose}
      >
        <ChevronLeft size='md' />
      </Button>
      <Modal.Headline>
        <Modal.Title size='sm'>{title}</Modal.Title>
      </Modal.Headline>
    </Modal.Header>
    {children}
  </div>
);

export { EditorPanel, type EditorPanelProps };
