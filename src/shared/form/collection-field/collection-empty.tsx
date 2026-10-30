'use client';

import { useTranslations } from 'next-intl';

import { Text } from '@lafise/onyx-ui/typography/text';

import { useCollectionField } from './context';
import { collectionFieldTheme } from './themes';

const { empty, note } = collectionFieldTheme();

/** Placeholder of a collection without items. */
const CollectionEmpty = () => {
  const t = useTranslations('Form.collection');
  const { copy } = useCollectionField();

  return (
    <div className={empty()}>
      <Text size='sm' className={note()}>
        {t('empty', { noun: copy.noun, gender: copy.gender })}
      </Text>
    </div>
  );
};

export { CollectionEmpty };
