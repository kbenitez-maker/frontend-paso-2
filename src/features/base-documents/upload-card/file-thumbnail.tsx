'use client';

import Image from 'next/image';

import type { DocumentFile } from '@/server/api';
import type { CSSProperties, ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { Document, EyeOpened } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Text } from '@lafise/onyx-ui/typography/text';

import { PDF_MIME } from '../lib/file-rules';
import { useFilePreviewUrl } from '../lib/use-file-preview-url';
import { fileThumbnailTheme } from './themes';

const { frame, icon, pdf, image, fade, preview } = fileThumbnailTheme();

/**
 * A PDF is not drawn in an `img`: the browser viewer paints its first page.
 * The frame is much taller than any sheet and a little wider than the box, so
 * the viewer always fits the page by its width and its own margin is cropped.
 */
const PDF_FRAME: CSSProperties = {
  top: '-3%',
  left: '-3%',
  width: '106%',
  aspectRatio: '1 / 2.6',
};

/** Hides the viewer chrome (toolbar, panes) so only the page shows. */
// cspell:ignore navpanes
const PDF_VIEW_PARAMS = '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';

interface FileThumbnailProps {
  requestId: string;
  itemId: string;
  file: DocumentFile;
  label: string;
  onPreview: () => void;
}

/** The uploaded document itself, not an icon for it, with the preview button over it. */
const FileThumbnail = ({
  requestId,
  itemId,
  file,
  label,
  onPreview,
}: Readonly<FileThumbnailProps>) => {
  const t = useTranslations('BaseDocuments.upload');
  const { url } = useFilePreviewUrl(requestId, itemId, file.file_id);

  const renderContent = (): ReactNode => {
    if (url === undefined) return <Document size='lg' className={icon()} />;
    if (file.mime_type === PDF_MIME) {
      return (
        <object
          data={`${url}${PDF_VIEW_PARAMS}`}
          type={PDF_MIME}
          aria-label={label}
          className={pdf()}
          style={PDF_FRAME}
        >
          <Text size='sm'>{t('previewUnavailable', { name: label })}</Text>
        </object>
      );
    }
    // The file is served by the API on its own origin, so `next/image` has nothing to optimize.
    return <Image src={url} alt='' fill unoptimized className={image()} />;
  };

  return (
    <div className={frame()}>
      {renderContent()}
      <div aria-hidden='true' className={fade()} />

      <Button
        icon
        variant='light'
        aria-label={t('preview', { name: label })}
        isDisabled={url === undefined}
        onPress={onPreview}
        size='xs'
        className={preview()}
      >
        <EyeOpened size='sm' />
      </Button>
    </div>
  );
};

export { FileThumbnail, type FileThumbnailProps };
