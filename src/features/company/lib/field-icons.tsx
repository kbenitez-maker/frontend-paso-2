import type { ReactNode } from 'react';

import { Briefcase, Phone, Pin, User } from '@lafise/onyx-icons';

/** Leading icons of the company text inputs, by what the key asks for. */
const COMPANY_ICONS: ReadonlyMap<string, ReactNode> = new Map([
  ['legal_name', <Briefcase key='briefcase' size='sm' />],
  ['trade_name', <User key='user' size='sm' />],
  ['parent_company_name', <Briefcase key='briefcase' size='sm' />],
  ['company_phone', <Phone key='phone' size='sm' />],
  ['parent_phone_number', <Phone key='phone' size='sm' />],
  ['address_detail', <Pin key='pin' size='sm' />],
  ['additional_branches_address', <Pin key='pin' size='sm' />],
  ['parent_address_detail', <Pin key='pin' size='sm' />],
  ['tax_address_detail', <Pin key='pin' size='sm' />],
  ['street', <Pin key='pin' size='sm' />],
  ['building', <Pin key='pin' size='sm' />],
]);

export { COMPANY_ICONS };
