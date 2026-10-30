'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@lafise/onyx-ui/overlays/modal';
import { Text } from '@lafise/onyx-ui/typography/text';

import { useCollectionItemEditor } from './context';
import { collectionItemEditorTheme } from './themes';

const { duplicateDialog, duplicateNotice } = collectionItemEditorTheme();

interface DuplicateDialogProps {
  /** Keeps editing the draft (also on dismiss). */
  onStay: () => void;
  /** Discards the draft and opens the saved item instead. */
  onOpen: () => void;
}

/** POC: the same person twice opens the saved item instead of creating a second one. */
const DuplicateDialog = ({
  onStay,
  onOpen,
}: Readonly<DuplicateDialogProps>) => {
  const t = useTranslations('Form.collection');
  const { name, copies } = useCollectionItemEditor();
  // eslint-disable-next-line security/detect-object-injection -- `name` is a registry collection key
  const copy = copies[name];

  return (
    <Modal.Root
      isOpen
      onOpenChange={(open) => {
        if (!open) onStay();
      }}
    >
      <Modal role='alertdialog' dialogProps={{ className: duplicateDialog() }}>
        <Modal.Header>
          <Modal.Slot>
            <Modal.Headline>
              <Modal.Title size='sm'>{t('duplicate.title')}</Modal.Title>
              <Modal.Description>
                {t('duplicate.description')}
              </Modal.Description>
            </Modal.Headline>
            <Modal.CloseButton />
          </Modal.Slot>
        </Modal.Header>
        <Modal.Body>
          <Text size='md' className={duplicateNotice()}>
            {copy?.duplicate ??
              t('duplicate.notice', { noun: copy?.noun ?? t('noun') })}
          </Text>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.Cancel onPress={onStay}>{t('duplicate.stay')}</Modal.Cancel>
            <Modal.Action onPress={onOpen}>{t('duplicate.open')}</Modal.Action>
          </Modal.Actions>
        </Modal.Footer>
      </Modal>
    </Modal.Root>
  );
};

export { DuplicateDialog, type DuplicateDialogProps };
