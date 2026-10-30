'use client';

import { Button } from '@lafise/onyx-ui/base/button';
import { Modal } from '@lafise/onyx-ui/overlays/modal';

interface EditorFooterProps {
  cancelLabel: string;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
}

/** Cancel and save actions of the draft. */
const EditorFooter = ({
  cancelLabel,
  saveLabel,
  onCancel,
  onSave,
}: Readonly<EditorFooterProps>) => (
  <Modal.Footer>
    <Modal.Actions>
      <Button variant='outline' onPress={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant='primary' onPress={onSave}>
        {saveLabel}
      </Button>
    </Modal.Actions>
  </Modal.Footer>
);

export { EditorFooter, type EditorFooterProps };
