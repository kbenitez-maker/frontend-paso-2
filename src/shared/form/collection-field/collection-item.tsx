'use client';

import type { Item } from './types';

import { useTranslations } from 'next-intl';

import { Delete, Pencil } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { ListBox } from '@lafise/onyx-ui/collections/list-box';

import { isItemVisible } from '@/contracts/visibility';

import { useErrorText } from '../hooks';
import { CollectionSummary } from './collection-summary';
import { useCollectionField } from './context';
import { collectionFieldTheme } from './themes';

const { description } = collectionFieldTheme();

interface CollectionItemProps {
  /** Position of the item: its id and the base of its form path. */
  index: number;
  item: Item;
}

/** One saved item: its title, its summary or first problem, and edit/remove actions. */
const CollectionItem = ({ index, item }: Readonly<CollectionItemProps>) => {
  const t = useTranslations('Form.collection');
  const errorText = useErrorText();
  const { copy, own, scope, country, problems, titles, titleOf, edit, remove } =
    useCollectionField();
  const problem = problems.get(index);
  const title = titles.at(index) ?? titleOf(index);
  const visibleFields = own.filter((field) =>
    isItemVisible(field.visible_when, scope, item, country),
  );

  return (
    <ListBox.Item id={String(index)} textValue={title}>
      <ListBox.Content>
        <ListBox.Label>{title}</ListBox.Label>
        <ListBox.Description
          className={description({ invalid: problem !== undefined })}
        >
          {problem === undefined ?
            <CollectionSummary fields={visibleFields} item={item} />
          : errorText(problem)}
        </ListBox.Description>
      </ListBox.Content>
      <ListBox.Suffix>
        <Button
          icon
          variant='plain'
          size='sm'
          aria-label={t('edit', { noun: copy.noun, index: index + 1 })}
          onPress={() => {
            edit(index);
          }}
        >
          <Pencil size='md' />
        </Button>
        <Button
          icon
          variant='plain'
          size='sm'
          aria-label={t('remove', { noun: copy.noun, index: index + 1 })}
          // POC: removing asks only when it breaks another section, a rule the registry lacks.
          onPress={() => {
            remove(index);
          }}
        >
          <Delete size='md' />
        </Button>
      </ListBox.Suffix>
    </ListBox.Item>
  );
};

export { CollectionItem, type CollectionItemProps };
