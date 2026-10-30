import { useTranslations } from 'next-intl';
import { Button } from 'react-aria-components/Button';
import { FileTrigger } from 'react-aria-components/FileTrigger';

import { DragAndDrop } from '@lafise/onyx-icons';
import { Text } from '@lafise/onyx-ui/typography/text';

import { useUploadCard } from './context';
import { dropZoneTheme } from './themes';

const { box, prompt, hint: hintText, icon } = dropZoneTheme();

/**
 * Empty state: the box is the drop target and, for keyboard and pointer users
 * who do not drag, a button that opens the file picker.
 */
const DropZone = () => {
  const t = useTranslations('BaseDocuments.upload');
  const { item, error, hint, pick } = useUploadCard();

  return (
    <FileTrigger acceptedFileTypes={item.accepted_types} onSelect={pick}>
      <Button className={box()}>
        <DragAndDrop
          size='md'
          className={icon({ warning: error !== undefined })}
        />
        <Text size='sm' className={prompt()}>
          {t('prompt')}
        </Text>
        <Text size='sm' className={hintText()}>
          {hint}
        </Text>
      </Button>
    </FileTrigger>
  );
};

export { DropZone };
