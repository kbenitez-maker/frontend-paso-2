'use client';

import { useTranslations } from 'next-intl';

import { InfoCircle } from '@lafise/onyx-icons';
import { Notification } from '@lafise/onyx-ui/status/notification';

import { useCollectionItemEditor } from './context';

/** POC: one notice above the form says where the locked data comes from. */
const KnownPersonNotice = () => {
  const t = useTranslations('Form.collection');
  const { known, copies } = useCollectionItemEditor();
  if (known === undefined) return null;

  return (
    <Notification status='info'>
      <Notification.Icon>
        <InfoCircle />
      </Notification.Icon>
      <Notification.Content>
        {t('known', {
          name: known.name === '' ? t('someone') : known.name,
          section: copies[known.collection]?.label ?? known.collection,
        })}
      </Notification.Content>
    </Notification>
  );
};

export { KnownPersonNotice };
