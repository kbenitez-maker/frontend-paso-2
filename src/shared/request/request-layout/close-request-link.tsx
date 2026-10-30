'use client';

import { useTranslations } from 'next-intl';

import { Close } from '@lafise/onyx-icons';
import { AnimatedButton } from '@lafise/onyx-ui/base/animated-button';
import { Modal } from '@lafise/onyx-ui/overlays/modal';

import { routes } from '@/lib/routes';

import { requestLayoutTheme } from './themes';

const { close, exitDialog } = requestLayoutTheme();

/**
 * Exit control of the request (POC parity): an `AnimatedButton` that shows the
 * X at rest and reveals "Save and exit" on hover, then confirms in a modal.
 * Leaving goes to another zone, so it is a full navigation.
 */
const CloseRequestLink = () => {
  const t = useTranslations('Request.exit');

  return (
    <Modal.Root>
      <AnimatedButton
        variant='white'
        size='lg'
        aria-label={t('label')}
        className={close()}
      >
        <AnimatedButton.Icon>
          <Close size='md' />
        </AnimatedButton.Icon>
        <AnimatedButton.Label>{t('label')}</AnimatedButton.Label>
      </AnimatedButton>

      <Modal role='alertdialog' dialogProps={{ className: exitDialog() }}>
        <Modal.Header>
          <Modal.Slot>
            <Modal.Headline>
              <Modal.Title size='sm'>{t('title')}</Modal.Title>
              <Modal.Description>{t('description')}</Modal.Description>
            </Modal.Headline>
            <Modal.CloseButton />
          </Modal.Slot>
        </Modal.Header>

        <Modal.Footer>
          <Modal.Actions>
            <Modal.Cancel>{t('stay')}</Modal.Cancel>
            <Modal.Action
              onPress={() => {
                globalThis.location.assign(routes.external.requests());
              }}
            >
              {t('label')}
            </Modal.Action>
          </Modal.Actions>
        </Modal.Footer>
      </Modal>
    </Modal.Root>
  );
};

export { CloseRequestLink };
