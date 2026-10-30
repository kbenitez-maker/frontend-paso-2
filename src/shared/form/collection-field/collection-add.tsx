'use client';

import { useTranslations } from 'next-intl';

import { Add } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Text } from '@lafise/onyx-ui/typography/text';

import { useCollectionField } from './context';
import { collectionFieldTheme } from './themes';

const { add, note } = collectionFieldTheme();

interface CollectionAddProps {
  /** Kept in the DOM but hidden when a custom list adds items itself. */
  hidden?: boolean;
}

/** Button that opens a new item, disabled with a notice at the maximum. */
const CollectionAdd = ({ hidden = false }: Readonly<CollectionAddProps>) => {
  const t = useTranslations('Form.collection');
  const { copy, items, max, edit } = useCollectionField();
  const atMax = items.length >= max;

  return (
    <div className={add()} hidden={hidden}>
      <Button
        variant='outline'
        isDisabled={atMax}
        onPress={() => {
          edit(items.length);
        }}
      >
        <Add size='md' />
        {t('add', { noun: copy.noun })}
      </Button>
      {atMax ?
        <Text size='sm' className={note()}>
          {t('maxReached', { max })}
        </Text>
      : null}
    </div>
  );
};

export { CollectionAdd, type CollectionAddProps };
