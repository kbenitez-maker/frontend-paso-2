'use client';

import Image from 'next/image';

import type { PreviewBodyProps } from './types';

import { useTranslations } from 'next-intl';

import { Button } from '@lafise/onyx-ui/base/button';
import { Notification } from '@lafise/onyx-ui/status/notification';
import { Text } from '@lafise/onyx-ui/typography/text';

import { PDF_MIME } from '../lib/file-rules';
import { useFilePreviewUrl } from '../lib/use-file-preview-url';
import { filePreviewModalTheme } from './themes';

const { error, loading, pdf, image } = filePreviewModalTheme();

/** Fetches the short-lived URL when opened and draws the file: a PDF in the viewer, an image as is. */
const PreviewBody = ({ requestId, target }: Readonly<PreviewBodyProps>) => {
  const t = useTranslations('BaseDocuments.preview');
  const { file, itemId } = target;
  const { url, isLoading, isError, retry } = useFilePreviewUrl(
    requestId,
    itemId,
    file.file_id,
  );

  if (isError) {
    return (
      <div className={error()}>
        <Notification status='error'>
          <Notification.Icon />
          <Notification.Content>{t('unavailable')}</Notification.Content>
        </Notification>
        <Button variant='outline' size='sm' onPress={retry}>
          {t('retry')}
        </Button>
      </div>
    );
  }
  if (isLoading || url === undefined) {
    return (
      <Text size='sm' className={loading()}>
        {t('loading')}
      </Text>
    );
  }
  if (file.mime_type === PDF_MIME) {
    return (
      <object
        data={url}
        type={PDF_MIME}
        className={pdf()}
        aria-label={file.name}
      >
        <Text size='sm'>{t('pdfUnavailable', { name: file.name })}</Text>
      </object>
    );
  }
  // The bytes come from a short-lived API URL on its own origin: nothing for `next/image` to optimize.
  // Zero width/height: the natural size is unknown, so CSS sizes it.
  return (
    <Image
      src={url}
      alt={file.name}
      width={0}
      height={0}
      unoptimized
      className={image()}
    />
  );
};

export { PreviewBody };
