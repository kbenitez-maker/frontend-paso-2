'use client';

import { createContext, use } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';
import type { Item } from '../collection-field';
import type { Entry } from './lib/entries';
import type { KnownPerson } from './lib/person-identity';

type Labels = Readonly<Partial<Record<string, string>>>;

/** Copy of the collections the editor reads (`Form.collections`). */
type EditorCopies = Readonly<
  Partial<
    Record<
      string,
      {
        label: string;
        noun: string;
        tabs?: Labels;
        /** Collection-specific duplicate notice (POC: shareholders talk about their share). */
        duplicate?: string;
      }
    >
  >
>;

/** State of the item draft shared by the editor's parts. */
interface CollectionItemEditorContextValue {
  /** Key of the collection; the draft lives at `<name>.0` of its own form. */
  name: string;
  /** Fields of the item plus those of its child collections. */
  fields: readonly FieldDefinition[];
  scope: Readonly<Record<string, unknown>>;
  /** `scope` plus the draft's answers: what child collection conditions read. */
  itemScope: Readonly<Record<string, unknown>>;
  country: CountryCode;
  bankId: BankId;
  labelOf: (key: string, variant?: string) => string;
  icons: ReadonlyMap<string, ReactNode> | undefined;
  /** Answers inherited from the same person in another collection: shown read-only. */
  inherited: Item;
  /** Keys shown read-only (decided by where the item was opened from). */
  locked: readonly string[];
  known: KnownPerson | undefined;
  copies: EditorCopies;
  tabLabels: Labels;
  groupLabels: Labels;
  isShown: (entry: Entry) => boolean;
}

const CollectionItemEditorContext = createContext<
  CollectionItemEditorContextValue | undefined
>(undefined);

const useCollectionItemEditor = (): CollectionItemEditorContextValue => {
  const context = use(CollectionItemEditorContext);
  if (context === undefined) {
    throw new Error(
      'useCollectionItemEditor must be used within a CollectionItemEditor',
    );
  }
  return context;
};

export {
  CollectionItemEditorContext,
  useCollectionItemEditor,
  type CollectionItemEditorContextValue,
  type EditorCopies,
};
