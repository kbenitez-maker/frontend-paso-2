'use client';

import { useState } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { ReactNode } from 'react';
import type { Item } from '../collection-field';
import type { CollectionItemEditorContextValue, EditorCopies } from './context';
import type { Entry } from './lib/entries';
import type { MapAnswer } from './types';

import { useMessages } from 'next-intl';
import { FormProvider } from 'react-hook-form';

import { Modal } from '@lafise/onyx-ui/overlays/modal';

import {
  isCollectionShown,
  isItemVisible,
  itemsOf,
  ownFieldsOf,
} from '@/contracts';

import { CollectionItemEditorContext } from './context';
import { DuplicateDialog } from './duplicate-dialog';
import { EditorFields } from './editor-fields';
import { EditorFooter } from './editor-footer';
import { EditorModal } from './editor-modal';
import { EditorPanel } from './editor-panel';
import { collectionItemEditorTheme } from './themes';
import { useItemDraft } from './use-item-draft';

const { body } = collectionItemEditorTheme();

interface CollectionItemEditorProps {
  /** Key of the collection; the draft lives at `<name>.0` of its own form. */
  name: string;
  /** Fields of the item plus those of its child collections. */
  fields: readonly FieldDefinition[];
  scope: Readonly<Record<string, unknown>>;
  country: CountryCode;
  bankId: BankId;
  labelOf: (key: string, variant?: string) => string;
  icons?: ReadonlyMap<string, ReactNode> | undefined;
  /** Item being edited (empty for a new one). */
  item: Item;
  /** Saved items of the collection, to spot the same person twice. */
  items: readonly Item[];
  /** Position of the item; `items.length` for a new one. */
  index: number;
  /** Keys shown read-only (decided by where the item was opened from). */
  locked?: readonly string[] | undefined;
  /** Answers a change implies (e.g. a shortcut copying an identification). */
  mapAnswer?: MapAnswer | undefined;
  /** Discards the draft and opens the saved item at `index` instead. */
  onOpenExisting: (index: number) => void;
  title: string;
  saveLabel: string;
  cancelLabel: string;
  /** Child collection item: a panel over the parent modal with a back button. */
  nested?: boolean;
  backLabel: string;
  onSave: (item: Item) => void;
  onClose: () => void;
}

/**
 * Modal that edits a draft of one collection item in its own form: nothing
 * reaches the step form (nor autosave) until the item is saved. Saving never
 * waits for the item to be complete (POC): an incomplete item is kept as a
 * draft, flagged in the list, and keeps the section open. Child collections
 * are edited inside the draft (a nested list, and a panel over this modal per
 * child item), so they are kept only when the parent item is saved.
 */
const CollectionItemEditorRoot = ({
  name,
  fields,
  scope,
  country,
  bankId,
  labelOf,
  icons,
  item,
  items,
  index,
  locked = [],
  mapAnswer,
  onOpenExisting,
  title,
  saveLabel,
  cancelLabel,
  nested = false,
  backLabel,
  onSave,
  onClose,
}: Readonly<CollectionItemEditorProps>) => {
  const messages = useMessages().Form;
  const copies: EditorCopies = messages.collections;
  const { form, answers, known, inherited, duplicate, identity, valuesToSave } =
    useItemDraft({
      name,
      fields,
      scope,
      country,
      item,
      items,
      index,
      mapAnswer,
    });
  // POC: warned once per identification, not on every keystroke after "stay here".
  const [dismissed, setDismissed] = useState<string | undefined>(undefined);
  // Child collection conditions may read the parent item's answers.
  const itemScope = { ...scope, ...answers };

  const value: CollectionItemEditorContextValue = {
    name,
    fields,
    scope,
    itemScope,
    country,
    bankId,
    labelOf,
    icons,
    inherited,
    locked,
    known,
    copies,
    // eslint-disable-next-line security/detect-object-injection -- `name` is a registry collection key
    tabLabels: copies[name]?.tabs ?? {},
    groupLabels: messages.collection.groups,
    isShown: (entry: Entry): boolean =>
      typeof entry === 'string' ?
        isCollectionShown(
          ownFieldsOf(fields, entry),
          itemsOf(answers, entry),
          itemScope,
          country,
        )
      : isItemVisible(entry.visible_when, scope, answers, country),
  };

  const content = (
    <>
      <Modal.Body className={body()}>
        <FormProvider {...form}>
          <EditorFields tabbed={!nested} />
        </FormProvider>
      </Modal.Body>
      <EditorFooter
        cancelLabel={cancelLabel}
        saveLabel={saveLabel}
        onCancel={onClose}
        onSave={() => {
          onSave(valuesToSave());
        }}
      />
      {duplicate === undefined || dismissed === identity ? null : (
        <DuplicateDialog
          onStay={() => {
            setDismissed(identity);
          }}
          onOpen={() => {
            onOpenExisting(duplicate);
          }}
        />
      )}
    </>
  );

  return (
    <CollectionItemEditorContext value={value}>
      {nested ?
        <EditorPanel title={title} backLabel={backLabel} onClose={onClose}>
          {content}
        </EditorPanel>
      : <EditorModal title={title} onClose={onClose}>
          {content}
        </EditorModal>
      }
    </CollectionItemEditorContext>
  );
};

export { CollectionItemEditorRoot, type CollectionItemEditorProps };
