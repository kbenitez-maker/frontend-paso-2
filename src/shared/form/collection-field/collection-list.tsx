'use client';

import { ListBox } from '@lafise/onyx-ui/collections/list-box';

import { CollectionItem } from './collection-item';
import { useCollectionField } from './context';

/** Saved items as a list; pressing an item opens it in the editor. */
const CollectionList = () => {
  const { listLabel, items, edit } = useCollectionField();

  return (
    <ListBox
      aria-label={listLabel}
      dense={false}
      selectionMode='none'
      variant='gray'
      onAction={(key) => {
        edit(Number(key));
      }}
    >
      {items.map((item, index) => (
        // Items carry no id: they are identified by position, and so are their form paths.
        // eslint-disable-next-line @eslint-react/no-array-index-key
        <CollectionItem key={index} index={index} item={item} />
      ))}
    </ListBox>
  );
};

export { CollectionList };
