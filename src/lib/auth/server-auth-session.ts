import 'server-only';

import { cookies } from 'next/headers';

import type { AuthSession } from './auth-session';

import { AUTH_SESSION_COOKIE, parseAuthSession } from './auth-session';

/**
 * Reads the `auth_session` cookie on the server. Works for `HttpOnly`
 * cookies, which `document.cookie` cannot expose.
 */
const getServerAuthSession = async (): Promise<AuthSession> => {
  const cookieStore = await cookies();
  return parseAuthSession(cookieStore.get(AUTH_SESSION_COOKIE)?.value);
};

export { getServerAuthSession };
