import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Redirects to another zone. `redirect()` prepends this zone's basePath to
 * host paths (`/home/...`), so those are made absolute from the request origin
 * first; already-absolute URLs (local dev, other port) pass through.
 */
const redirectToExternal = async (target: string): Promise<never> => {
  if (!target.startsWith('/')) return redirect(target);

  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  return redirect(host ? `${protocol}://${host}${target}` : target);
};

export { redirectToExternal };
