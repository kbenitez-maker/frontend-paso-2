import { CollectionAdd } from './collection-add';
import { CollectionEmpty } from './collection-empty';
import { CollectionFieldRoot } from './collection-field';
import { CollectionHeader } from './collection-header';
import { CollectionItem } from './collection-item';
import { CollectionList } from './collection-list';
import { CollectionSummary } from './collection-summary';
import { CollectionSummaryValue } from './collection-summary-value';

/**
 * Repeating group bound to the surrounding form: `<CollectionField />` renders
 * the whole collection; its parts read the collection state from context.
 */
const CollectionField = Object.assign(CollectionFieldRoot, {
  Header: CollectionHeader,
  Empty: CollectionEmpty,
  List: CollectionList,
  Item: CollectionItem,
  Summary: CollectionSummary,
  SummaryValue: CollectionSummaryValue,
  Add: CollectionAdd,
});

export { CollectionField };
export type { CollectionHandle, Item } from './types';
