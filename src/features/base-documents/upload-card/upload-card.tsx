'use client';

import { useState } from 'react';

import type { DocumentChecklistItem, DocumentFile } from '@/server/api';
import type { ReactNode } from 'react';
import type { UploadCardContextValue } from './context';

import { useLocale, useTranslations } from 'next-intl';

import { Download } from '@lafise/onyx-icons';
import { Link } from '@lafise/onyx-ui/base/link';
import { Text } from '@lafise/onyx-ui/typography/text';

import { acceptedTypesLabel, megabytesOf } from '../lib/file-rules';
import { UploadCardContext } from './context';
import { DropZone } from './drop-zone';
import { FileFooter } from './file-footer';
import { FileThumbnail } from './file-thumbnail';
import { templateLinkTheme, uploadCardTheme } from './themes';
import { UploadProgress } from './upload-progress';
import { useItemUpload } from './use-item-upload';

const { root, body, caption, label, description } = uploadCardTheme();

interface UploadCardProps {
  requestId: string;
  item: DocumentChecklistItem;
  onPreview: (file: DocumentFile) => void;
}

/**
 * Upload card of one checklist item: drag a file onto it or pick one. It does
 * not turn red on error: only one document has to be redone, so the reason is
 * said in the text and the card keeps its frame.
 */
const UploadCardRoot = ({
  requestId,
  item,
  onPreview,
}: Readonly<UploadCardProps>) => {
  const t = useTranslations('BaseDocuments.upload');
  const [isOver, setIsOver] = useState(false);
  const locale = useLocale();
  const typesLabel = acceptedTypesLabel(item.accepted_types, locale);
  const { progress, error, receive, removeFile, isBusy } = useItemUpload({
    requestId,
    item,
    typesLabel,
  });
  const file = item.files.at(-1);
  const hint = t('hint', {
    types: typesLabel,
    mb: megabytesOf(item.max_size_bytes),
  });

  let state: 'empty' | 'over' | 'loaded' | 'error' = 'empty';
  if (error !== undefined) state = 'error';
  else if (isOver) state = 'over';
  else if (file !== undefined) state = 'loaded';

  const accept = (picked: File | undefined) => {
    if (picked) void receive(picked);
  };
  const pick = (files: FileList | null) => {
    accept(files?.[0]);
  };
  const context: UploadCardContextValue = {
    item,
    file,
    progress,
    error,
    isBusy,
    hint,
    pick,
    remove: (fileId) => {
      void removeFile(fileId);
    },
  };

  const renderBox = (): ReactNode => {
    if (progress !== null) return <UploadProgress />;
    if (file === undefined) return <DropZone />;
    return (
      <FileThumbnail
        requestId={requestId}
        itemId={item.item_id}
        file={file}
        label={item.label}
        onPreview={() => {
          onPreview(file);
        }}
      />
    );
  };

  const renderCaption = (): ReactNode => {
    if (file !== undefined && progress === null) return <FileFooter />;
    return (
      <div className={caption()}>
        <Text size='sm' className={label()}>
          {item.label}
        </Text>
        <Text
          size='xs'
          className={description({ warning: error !== undefined })}
        >
          {error ?? item.rejection_reason ?? item.description}
        </Text>
      </div>
    );
  };

  return (
    <UploadCardContext value={context}>
      {/* The drop target has no keyboard equivalent and needs none: the box holds a button that opens the picker. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- drop zone with its own accessible alternative */}
      <div
        className={root({ state })}
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => {
          setIsOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          accept(event.dataTransfer.files[0]);
        }}
      >
        <div className={body()}>
          {renderBox()}

          {renderCaption()}

          {item.template_url === undefined ? null : (
            <Link
              href={item.template_url}
              download
              className={templateLinkTheme({ variant: 'outline', size: 'xs' })}
            >
              <Download size='sm' />
              {t('downloadTemplate')}
            </Link>
          )}
        </div>
      </div>
    </UploadCardContext>
  );
};

export { UploadCardRoot, type UploadCardProps };
