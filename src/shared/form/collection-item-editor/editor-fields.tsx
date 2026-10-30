'use client';

import { useCollectionItemEditor } from './context';
import { EditorGrid } from './editor-grid';
import { EditorGroups } from './editor-groups';
import { EditorTabs } from './editor-tabs';
import { KnownPersonNotice } from './known-person-notice';
import { entriesOf, tabOf, tabsOf } from './lib/entries';
import { collectionItemEditorTheme } from './themes';

const { fields: fieldsStyle } = collectionItemEditorTheme();

interface EditorFieldsProps {
  /** Child panels never have tabs: a child collection's `item_tab` places its list in the parent modal. */
  tabbed: boolean;
}

/** Everything the draft asks: in tabs when the item has them, after the known-person notice. */
const EditorFields = ({ tabbed }: Readonly<EditorFieldsProps>) => {
  const { name, fields, country, tabLabels, isShown } =
    useCollectionItemEditor();
  const entries = entriesOf(fields, name);
  const tabs =
    tabbed ? tabsOf(fields, entries, country, Object.keys(tabLabels)) : [];

  if (tabs.length === 0) {
    return (
      <div className={fieldsStyle()}>
        <KnownPersonNotice />
        <EditorGroups entries={entries.filter(isShown)} />
      </div>
    );
  }

  // Fields without a tab render above the tabs (POC: a common header).
  const header = entries.filter(
    (entry) => tabOf(fields, entry) === undefined && isShown(entry),
  );
  return (
    <div className={fieldsStyle()}>
      <KnownPersonNotice />
      {header.length === 0 ? null : <EditorGrid entries={header} />}
      <EditorTabs tabs={tabs} entries={entries} />
    </div>
  );
};

export { EditorFields, type EditorFieldsProps };
