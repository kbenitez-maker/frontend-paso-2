'use client';

import { createContext } from 'react';

/**
 * The request a form belongs to: request-scoped catalogs (`source: 'request'`)
 * list its people. Outside a request form they are unavailable.
 */
const RequestScopeContext = createContext<string | undefined>(undefined);

export { RequestScopeContext };
