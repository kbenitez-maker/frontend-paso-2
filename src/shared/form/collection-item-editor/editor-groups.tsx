'use client';

import type { Entry } from './lib/entries';

import { Divider } from '@lafise/onyx-ui/layout/divider';
import { Text } from '@lafise/onyx-ui/typography/text';

import { useCollectionItemEditor } from './context';
import { EditorGrid } from './editor-grid';
import { groupOf } from './lib/entries';
import { collectionItemEditorTheme } from './themes';

const {
  groups: groupsStyle,
  group: groupStyle,
  groupHeading,
} = collectionItemEditorTheme();

interface EditorGroupsProps {
  /** Entries to show, already filtered by visibility. */
  entries: readonly Entry[];
}

/** POC: sub-group headings only once the shown fields span two groups; ungrouped fields go first. */
const EditorGroups = ({ entries }: Readonly<EditorGroupsProps>) => {
  const { fields, groupLabels } = useCollectionItemEditor();
  const groups = [
    ...new Set(
      entries.flatMap((entry) => {
        const group = groupOf(fields, entry);
        return group === undefined ? [] : [group];
      }),
    ),
  ];
  if (groups.length <= 1) return <EditorGrid entries={entries} />;
  const loose = entries.filter((entry) => groupOf(fields, entry) === undefined);

  return (
    <div className={groupsStyle()}>
      {loose.length === 0 ? null : <EditorGrid entries={loose} />}
      {groups.map((group, position) => (
        <section key={group} className={groupStyle()}>
          {position === 0 && loose.length === 0 ? null : <Divider />}
          <Text size='sm' className={groupHeading()}>
            {/* eslint-disable-next-line security/detect-object-injection -- `group` comes from the registry */}
            {groupLabels[group] ?? group}
          </Text>
          <EditorGrid
            entries={entries.filter(
              (entry) => groupOf(fields, entry) === group,
            )}
          />
        </section>
      ))}
    </div>
  );
};

export { EditorGroups, type EditorGroupsProps };
