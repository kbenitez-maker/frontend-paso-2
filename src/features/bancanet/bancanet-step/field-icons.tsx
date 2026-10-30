import type { ReactNode } from 'react';

import { Phone, Pin, User } from '@lafise/onyx-icons';

/** Leading icons of the Bancanet superuser text inputs, by what the key asks for. */
const BANCANET_ICONS: ReadonlyMap<string, ReactNode> = new Map([
  ['first_name', <User key='user' size='sm' />],
  ['second_name', <User key='user' size='sm' />],
  ['first_last_name', <User key='user' size='sm' />],
  ['second_last_name', <User key='user' size='sm' />],
  ['mobile_phone', <Phone key='phone' size='sm' />],
  ['address_detail', <Pin key='pin' size='sm' />],
]);

export { BANCANET_ICONS };
