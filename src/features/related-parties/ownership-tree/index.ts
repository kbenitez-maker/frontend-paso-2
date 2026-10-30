import { Action } from './action';
import { OwnershipTreeRoot } from './ownership-tree';
import { SplitBar } from './split-bar';

/**
 * The shareholders list as a tree rooted at the holder company; the split bar
 * and the round row buttons are its parts.
 */
const OwnershipTree = Object.assign(OwnershipTreeRoot, {
  SplitBar,
  Action,
});

export { OwnershipTree };
export { addShareholderTo } from './lib/add-shareholder-to';
export type { OwnershipTreeProps } from './ownership-tree';
