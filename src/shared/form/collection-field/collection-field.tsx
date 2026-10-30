'use client';

import { useImperativeHandle } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode, Ref } from 'react';
import type { MapAnswer } from '../collection-item-editor';
import type { CollectionHandle, Item } from './types';

import { useTranslations } from 'next-intl';

import { CollectionItemEditor } from '../collection-item-editor';
import { FieldMessages } from '../field-messages';
import { CollectionAdd } from './collection-add';
import { CollectionEmpty } from './collection-empty';
import { CollectionHeader } from './collection-header';
import { CollectionList } from './collection-list';
import { CollectionFieldContext } from './context';
import { collectionFieldTheme } from './themes';
import { useCollection } from './use-collection';

const { root } = collectionFieldTheme();

interface CollectionFieldProps {
  /** Key of the embedded collection (its copy and its fields' `collection`). */
  name: string;
  /** Form path of the array; defaults to `name` (a child collection lives inside the parent item draft). */
  path?: string;
  /**
   * Fields of one item, plus the fields of its child collections; each shows
   * when visible under `scope` plus the item's own values.
   */
  fields: readonly FieldDefinition[];
  /** Values outside the collection that conditions may read. */
  scope?: Readonly<Record<string, unknown>>;
  country: CountryCode;
  bankId: BankId;
  labelOf: (key: string, variant?: string) => string;
  /** Leading icons of text inputs by field key. */
  icons?: ReadonlyMap<string, ReactNode> | undefined;
  /** Child collection inside a parent item editor: items open in a panel over it. */
  nested?: boolean;
  /**
   * Replaces the flat list and its add button (the shareholders tree); the
   * collection's own rule errors are left to it too.
   */
  renderList?: (list: CollectionHandle) => ReactNode;
  /** The same actions for UI outside the list (a summary that opens a new item). */
  listRef?: Ref<CollectionHandle>;
  /** Answers a change in the item draft implies (e.g. a shortcut copying an identification). */
  mapAnswer?: MapAnswer;
  /** Adjusts the list after an item is saved (e.g. children following a renamed parent). */
  afterSave?: (
    items: Item[],
    previous: Item | undefined,
    saved: Item,
  ) => Item[];
}

/**
 * Repeating group as a list plus a modal (POC parity): items are added and
 * edited in a draft form and only committed on save, then autosaved.
 */
const CollectionFieldRoot = ({
  name,
  path = name,
  fields,
  scope = {},
  country,
  bankId,
  labelOf,
  icons,
  nested = false,
  renderList,
  listRef,
  mapAnswer,
  afterSave,
}: Readonly<CollectionFieldProps>) => {
  const t = useTranslations('Form.collection');
  const { value, error, handle, draft, save, close } = useCollection({
    name,
    path,
    fields,
    scope,
    country,
    bankId,
    hasCustomList: renderList !== undefined,
    afterSave,
  });
  useImperativeHandle(listRef, () => handle);
  const { copy, items, titleOf } = value;
  const renderBody = (): ReactNode => {
    if (renderList) return renderList(handle);
    return items.length === 0 ? <CollectionEmpty /> : <CollectionList />;
  };

  return (
    <CollectionFieldContext value={value}>
      <div className={root()}>
        <CollectionHeader />
        {renderBody()}
        <CollectionAdd hidden={renderList !== undefined} />
        {/* POC: the collection's help stays under the list, above its error. */}
        <FieldMessages hint={copy.help} />
        <FieldMessages error={error} />

        {draft === null ? null : (
          <CollectionItemEditor
            // A duplicate opens the saved item: a fresh draft form for it.
            key={draft.index}
            name={name}
            fields={fields}
            scope={scope}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            icons={icons}
            item={items.at(draft.index) ?? draft.preset ?? {}}
            locked={draft.locked}
            mapAnswer={mapAnswer}
            items={items}
            index={draft.index}
            onOpenExisting={value.edit}
            title={
              draft.index < items.length ?
                titleOf(draft.index)
              : t('new', { noun: copy.noun, gender: copy.gender })
            }
            saveLabel={t('save', { noun: copy.noun })}
            cancelLabel={t('cancel')}
            nested={nested}
            backLabel={t('back')}
            onSave={(item) => {
              save(draft.index, item);
            }}
            onClose={close}
          />
        )}
      </div>
    </CollectionFieldContext>
  );
};

export { CollectionFieldRoot, type CollectionFieldProps };
