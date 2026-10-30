'use client';

import type { Entry } from './lib/entries';

import { ownFieldsOf } from '@/contracts';
import { catalogDependentsOf } from '@/contracts/catalogs';

import { CollectionField } from '../collection-field';
import { FormField, iconOf } from '../form-field';
import { useCollectionItemEditor } from './context';
import { pathOf } from './lib/entries';
import { collectionItemEditorTheme } from './themes';

const { grid } = collectionItemEditorTheme();

interface EditorGridProps {
  /** Entries to show, already filtered by visibility. */
  entries: readonly Entry[];
}

/** Two-column grid of the draft's fields; a child collection takes a whole row as a nested list. */
const EditorGrid = ({ entries }: Readonly<EditorGridProps>) => {
  const {
    name,
    fields,
    itemScope,
    country,
    bankId,
    labelOf,
    icons,
    inherited,
    locked,
  } = useCollectionItemEditor();

  return (
    <div className={grid()}>
      {entries.map((entry) =>
        typeof entry === 'string' ?
          <CollectionField
            key={entry}
            name={entry}
            path={pathOf(name, entry)}
            fields={ownFieldsOf(fields, entry)}
            scope={itemScope}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            icons={icons}
            nested
          />
        : <FormField
            key={entry.key}
            field={
              (
                Object.hasOwn(inherited, entry.key) ||
                locked.includes(entry.key)
              ) ?
                { ...entry, read_only: true }
              : entry
            }
            name={pathOf(name, entry)}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            icon={iconOf(entry, icons)}
            dependents={catalogDependentsOf(
              ownFieldsOf(fields, name),
              entry.key,
              country,
            )}
          />,
      )}
    </div>
  );
};

export { EditorGrid, type EditorGridProps };
