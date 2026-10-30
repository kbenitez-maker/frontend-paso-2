/** One item of a collection: field keys to untyped answers. */
type Item = Record<string, unknown>;

/** Copy of a collection (`Form.collections.<name>`). */
interface CollectionCopy {
  label: string;
  noun: string;
  gender: string;
  /** Product copy of the collection's minimum (POC `mensajeFalta`). */
  missing?: string;
  /** Help under the list (POC collection `ayuda`). */
  help?: string;
}

/** What a custom list (`renderList`) gets to show the items and act on them. */
interface CollectionHandle {
  items: readonly Item[];
  /** Name of each item (its title fields, else "<Noun> <n>"). */
  titles: readonly string[];
  /** Copy of the first problem of each incomplete item, by position. */
  problems: ReadonlyMap<number, string>;
  edit: (index: number) => void;
  /** Opens a new item with `preset` answers; `locked` keys show read-only. */
  add: (preset: Item, locked: readonly string[]) => void;
  remove: (index: number) => void;
}

export type { CollectionCopy, CollectionHandle, Item };
