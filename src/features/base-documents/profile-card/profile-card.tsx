'use client';

import type { DocumentChecklistItem, DocumentFile } from '@/server/api';

import { useTranslations } from 'next-intl';

import { Document } from '@lafise/onyx-icons';
import { Text } from '@lafise/onyx-ui/typography/text';

import { UploadCard } from '../upload-card';
import { profileCardTheme } from './themes';

const { root, body, placeholder, icon, caption, label, origin } =
  profileCardTheme();

interface ProfileCardProps {
  requestId: string;
  item: DocumentChecklistItem;
  onPreview: (file: DocumentFile) => void;
}

/**
 * A document delivered in the profiling, listed in the checklist as a record
 * (POC `constancia`): it can be looked at, not replaced or removed, because
 * changing it here would put the file out of sync.
 */
const ProfileCard = ({
  requestId,
  item,
  onPreview,
}: Readonly<ProfileCardProps>) => {
  const t = useTranslations('BaseDocuments.upload');
  const file = item.files.at(-1);

  return (
    <div className={root()}>
      <div className={body()}>
        {file === undefined ?
          <div className={placeholder()}>
            <Document size='lg' className={icon()} />
          </div>
        : <UploadCard.Thumbnail
            requestId={requestId}
            itemId={item.item_id}
            file={file}
            label={item.label}
            onPreview={() => {
              onPreview(file);
            }}
          />
        }

        <div className={caption()}>
          <Text size='sm' className={label()}>
            {item.label}
          </Text>
          <Text size='xs' className={origin()}>
            {t('fromProfile')}
          </Text>
        </div>
      </div>
    </div>
  );
};

export { ProfileCard, type ProfileCardProps };
