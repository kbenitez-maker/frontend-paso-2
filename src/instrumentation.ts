import { type Instrumentation } from 'next';

import { logger } from './lib/logger';

/**
 * Server render and route errors. Only the method and path of the request:
 * its headers carry the `auth_session` cookie with the access token.
 */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logger.error('Server request error', {
    event: 'server.request_error',
    method: request.method,
    path: request.path.split('?')[0],
    routePath: context.routePath,
    routeType: context.routeType,
    error: error instanceof Error ? error.message : String(error),
    digest:
      error instanceof Error && 'digest' in error ? error.digest : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
};
