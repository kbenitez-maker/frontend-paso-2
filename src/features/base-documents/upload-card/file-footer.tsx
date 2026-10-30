import { useTranslations } from 'next-intl';
import { FileTrigger } from 'react-aria-components/FileTrigger';

import { Delete, Pencil } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Text } from '@lafise/onyx-ui/typography/text';

import { formatBytes } from '../lib/file-rules';
import { useUploadCard } from './context';
import { fileFooterTheme } from './themes';

const { root, caption, label, meta, name, size, actions, action } =
  fileFooterTheme();

/** Title, uploaded file name and size, and the replace and delete actions. */
const FileFooter = () => {
  const t = useTranslations('BaseDocuments.upload');
  const { item, file, isBusy, pick, remove } = useUploadCard();
  if (file === undefined) return null;

  return (
    <div className={root()}>
      <div className={caption()}>
        <Text size='sm' className={label()}>
          {item.label}
        </Text>
        <div className={meta()}>
          <Text size='xs' className={name()}>
            {file.name}
          </Text>
          <Text size='xs' className={size()}>
            {formatBytes(file.size_bytes)}
          </Text>
        </div>
      </div>

      <div className={actions()}>
        <FileTrigger acceptedFileTypes={item.accepted_types} onSelect={pick}>
          <Button
            icon
            variant='gray'
            aria-label={t('replace', { name: item.label })}
            isDisabled={isBusy}
            size='xs'
            className={action()}
          >
            <Pencil size='sm' />
          </Button>
        </FileTrigger>
        <Button
          icon
          variant='destructive'
          aria-label={t('remove', { name: item.label })}
          isDisabled={isBusy}
          onPress={() => {
            remove(file.file_id);
          }}
          size='xs'
          className={action()}
        >
          <Delete size='sm' />
        </Button>
      </div>
    </div>
  );
};

export { FileFooter };
