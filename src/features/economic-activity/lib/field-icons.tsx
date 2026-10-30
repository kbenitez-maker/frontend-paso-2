import type { ReactNode } from 'react';

import { Briefcase } from '@lafise/onyx-icons';

/** Leading icons of the economic-activity text inputs, by what the key asks for. */
const ECONOMIC_ACTIVITY_ICONS: ReadonlyMap<string, ReactNode> = new Map([
  ['corporate_purpose', <Briefcase key='briefcase' size='sm' />],
  ['supervising_regulator_name', <Briefcase key='briefcase' size='sm' />],
  ['external_audit_firm_name', <Briefcase key='briefcase' size='sm' />],
  ['other_stock_exchange_name', <Briefcase key='briefcase' size='sm' />],
]);

export { ECONOMIC_ACTIVITY_ICONS };
