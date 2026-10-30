import { documentOf } from '@/lib/ownership';

type Item = Record<string, unknown>;

const PARENT = 'shareholder_parent_company_id';

/** Children follow a company whose identification changed (they point to it by identification). */
const relink = (items: Item[], previous: Item | undefined, saved: Item) => {
  if (previous === undefined) return items;
  const before = documentOf(previous);
  const after = documentOf(saved);
  return before === '' || after === '' || before === after ?
      items
    : items.map((item) =>
        item['shareholder_parent_company_id'] === before ?
          { ...item, [PARENT]: after }
        : item,
      );
};

export { relink };
