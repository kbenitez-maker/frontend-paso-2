'use client';

import { useTranslations } from 'next-intl';

import { Text } from '@lafise/onyx-ui/typography/text';

import { useCollectionField } from './context';
import { collectionFieldTheme } from './themes';

const { header, label, note } = collectionFieldTheme();

/** Collection label and how many items it holds against its limits. */
const CollectionHeader = () => {
  const t = useTranslations('Form.collection');
  const { copy, items, min, max } = useCollectionField();
  const countLabel = (): string => {
    if (Number.isFinite(max))
      return t('countMax', { count: items.length, max });
    if (min > 0) return t('countMin', { count: items.length, min });
    return t('count', { count: items.length });
  };

  return (
    <div className={header()}>
      <Text size='sm' className={label()}>
        {copy.label}
      </Text>
      <Text size='sm' className={note()}>
        {countLabel()}
      </Text>
    </div>
  );
};

export { CollectionHeader };
