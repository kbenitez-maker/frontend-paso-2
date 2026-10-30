import { CollectionItemEditorRoot } from './collection-item-editor';
import { DuplicateDialog } from './duplicate-dialog';
import { EditorFields } from './editor-fields';
import { EditorFooter } from './editor-footer';
import { EditorGrid } from './editor-grid';
import { EditorGroups } from './editor-groups';
import { EditorModal } from './editor-modal';
import { EditorPanel } from './editor-panel';
import { EditorTabs } from './editor-tabs';
import { KnownPersonNotice } from './known-person-notice';

/**
 * Draft editor of one collection item: `<CollectionItemEditor />` renders it
 * as a modal (or a panel over the parent modal when `nested`); its parts read
 * the draft state from context.
 */
const CollectionItemEditor = Object.assign(CollectionItemEditorRoot, {
  Modal: EditorModal,
  Panel: EditorPanel,
  Fields: EditorFields,
  Tabs: EditorTabs,
  Groups: EditorGroups,
  Grid: EditorGrid,
  KnownPersonNotice,
  DuplicateDialog,
  Footer: EditorFooter,
});

export { CollectionItemEditor };
export type { MapAnswer } from './types';
