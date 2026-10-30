'use client';

import { createContext, use } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { CollectionCopy, Item } from './types';

/** State of a collection shared by its parts. */
interface CollectionFieldContextValue {
  copy: CollectionCopy;
  /** Accessible name of the list: the collection label, else its noun. */
  listLabel: string;
  /** Fields of one item (child collections left out). */
  own: readonly FieldDefinition[];
  scope: Readonly<Record<string, unknown>>;
  country: CountryCode;
  bankId: BankId;
  items: readonly Item[];
  titles: readonly string[];
  /** Code of the first problem of each incomplete item, by position. */
  problems: ReadonlyMap<number, string>;
  min: number;
  max: number;
  /** "<Noun> <n>" for the item at `index`. */
  titleOf: (index: number) => string;
  /** Opens the item at `index` (`items.length` for a new one). */
  edit: (index: number) => void;
  remove: (index: number) => void;
}

const CollectionFieldContext = createContext<
  CollectionFieldContextValue | undefined
>(undefined);

const useCollectionField = (): CollectionFieldContextValue => {
  const context = use(CollectionFieldContext);
  if (context === undefined) {
    throw new Error('useCollectionField must be used within a CollectionField');
  }
  return context;
};

export {
  CollectionFieldContext,
  useCollectionField,
  type CollectionFieldContextValue,
};
