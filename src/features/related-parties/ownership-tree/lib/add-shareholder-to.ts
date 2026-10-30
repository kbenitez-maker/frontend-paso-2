import type { CollectionHandle } from '@/shared/form/collection-field';

import { HOLDER, partiesOf, pointKeyOf, remainingIn } from '@/lib/ownership';

import { isFull } from './is-full';

const PARENT = 'shareholder_parent_company_id';
const PERCENTAGE = 'shareholder_share_percentage';

/**
 * Opens a new shareholder of `node` (`HOLDER` or a party id) with the company
 * decided and locked, and the capital it has left proposed (POC
 * `camposDelHijo`, abrir-rama.ts), still editable.
 */
const addShareholderTo = (list: CollectionHandle, node: string) => {
  const parties = partiesOf(list.items);
  const remaining = remainingIn(parties, node);
  const index = Number(node);
  list.add(
    {
      [PARENT]:
        node === HOLDER ? HOLDER : (
          pointKeyOf(list.items.at(index) ?? {}, index)
        ),
      ...(isFull(remaining) ? {} : { [PERCENTAGE]: remaining }),
    },
    [PARENT],
  );
};

export { addShareholderTo };
