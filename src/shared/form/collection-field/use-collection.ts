'use client';

import { useState } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { FormValues } from '../lib';
import type { CollectionFieldContextValue } from './context';
import type { CollectionCopy, CollectionHandle, Item } from './types';

import { useFormatter, useMessages, useTranslations } from 'next-intl';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';

import { isItemVisible, isRecord, ownFieldsOf } from '@/contracts/visibility';

import { useErrorText } from '../hooks';
import { itemProblems } from './lib/item-problems';

interface UseCollectionOptions {
  name: string;
  path: string;
  fields: readonly FieldDefinition[];
  scope: Readonly<Record<string, unknown>>;
  country: CountryCode;
  bankId: BankId;
  /** A custom list (`renderList`) reports the collection's own rule errors itself. */
  hasCustomList: boolean;
  afterSave:
    | ((items: Item[], previous: Item | undefined, saved: Item) => Item[])
    | undefined;
}

/** Item open in the editor: its position (`items.length` for a new one) and a new item's preset answers. */
interface Draft {
  index: number;
  preset?: Item;
  locked?: readonly string[];
}

const capitalize = (text: string): string =>
  text.charAt(0).toLocaleUpperCase() + text.slice(1);

/**
 * State of a collection bound to the surrounding form: its items, their
 * titles and problems, the collection error, and the item open in the editor.
 */
const useCollection = ({
  name,
  path,
  fields,
  scope,
  country,
  bankId,
  hasCustomList,
  afterSave,
}: UseCollectionOptions) => {
  const t = useTranslations('Form.collection');
  const format = useFormatter();
  const copies: Readonly<Partial<Record<string, CollectionCopy>>> =
    useMessages().Form.collections;
  // eslint-disable-next-line security/detect-object-injection -- `name` is a registry collection key
  const copy = copies[name] ?? { label: '', noun: t('noun'), gender: 'male' };
  const own = ownFieldsOf(fields, name);
  // Every item field carries its collection's limits.
  const min = own[0]?.min_items ?? 0;
  const max = own[0]?.max_items ?? Infinity;

  const { control, setValue, getFieldState } = useFormContext<FormValues>();
  useFormState({ control, name: path });
  const errorText = useErrorText();
  const error = getFieldState(path).error?.message;
  const watched: unknown = useWatch({ control, name: path });
  const items: Item[] =
    Array.isArray(watched) ?
      watched.map((item: unknown) => (isRecord(item) ? item : {}))
    : [];

  const [draft, setDraft] = useState<Draft | null>(null);
  const edit = (index: number | null) => {
    setDraft(index === null ? null : { index });
  };
  const problems = itemProblems(name, fields, items, scope, country);

  const update = (next: Item[]) => {
    setValue(path, next, { shouldDirty: true, shouldValidate: true });
  };
  const remove = (index: number) => {
    update(items.filter((_item, position) => position !== index));
  };
  const titleOf = (index: number) =>
    t('item', { noun: capitalize(copy.noun), index: index + 1 });
  const titles = items.map((item, index) => {
    // POC: the list names the item by its answered title fields, else by its position.
    const itemName = own
      .filter((field) =>
        isItemVisible(field.visible_when, scope, item, country),
      )
      .flatMap((field) => {
        const value = item[field.key];
        return field.item_title && typeof value === 'string' ?
            [value.trim()]
          : [];
      })
      .filter(Boolean)
      .join(' ');
    return itemName === '' ? titleOf(index) : itemName;
  });

  // POC: the collection's own rule (e.g. a joint signature with one signer) comes first, then
  // below the minimum (once there is an item) and items left as drafts.
  // Missing roles are explained by the step itself, with their names (see `StepFormProps.rule`).
  const ruleError =
    (
      hasCustomList ||
      error === 'min_items' ||
      error === 'required' ||
      error === 'missing_roles'
    ) ?
      undefined
    : errorText(error);
  const itemsError = (): string | undefined => {
    if (items.length > 0 && items.length < min) {
      return copy.missing ?? t('minItems', { min });
    }
    if (problems.size === 0) return undefined;
    return t('incompleteItems', {
      items: format.list(
        titles.filter((_title, index) => problems.has(index)),
        { type: 'conjunction' },
      ),
    });
  };
  const collectionError = ruleError ?? itemsError();

  const handle: CollectionHandle = {
    items,
    titles,
    problems: new Map(
      [...problems].map(([index, code]) => [index, errorText(code) ?? '']),
    ),
    edit,
    add: (preset, locked) => {
      setDraft({ index: items.length, preset, locked });
    },
    remove,
  };

  const value: CollectionFieldContextValue = {
    copy,
    listLabel: copy.label === '' ? capitalize(copy.noun) : copy.label,
    own,
    scope,
    country,
    bankId,
    items,
    titles,
    problems,
    min,
    max,
    titleOf,
    edit,
    remove,
  };

  /** Commits the draft at its position and closes the editor. */
  const save = (index: number, item: Item) => {
    const next =
      index < items.length ?
        items.map((current, position) => (position === index ? item : current))
      : [...items, item];
    update(afterSave?.(next, items.at(index), item) ?? next);
    edit(null);
  };
  const close = () => {
    edit(null);
  };

  return { value, error: collectionError, handle, draft, save, close };
};

export { useCollection };
