const AUTH_SESSION_COOKIE = 'auth_session';

interface AuthSession {
  userId: string | null;
  accessToken: string | null;
}

const EMPTY_SESSION: AuthSession = { userId: null, accessToken: null };

const tryParse = (value: string): object | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const readString = (source: object, key: string): string | null => {
  const field: unknown = Reflect.get(source, key);
  return typeof field === 'string' ? field : null;
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Parses the `auth_session` cookie value. The portal may store it as raw JSON
 * or URL-encoded JSON, so both are tried (same tolerance as the BFF proxy).
 */
const parseAuthSession = (raw: string | undefined): AuthSession => {
  if (!raw) return EMPTY_SESSION;

  const parsed = tryParse(raw) ?? tryParse(safeDecode(raw));
  if (!parsed) return EMPTY_SESSION;

  return {
    userId: readString(parsed, 'user_id'),
    accessToken: readString(parsed, 'access_token'),
  };
};

export { AUTH_SESSION_COOKIE, parseAuthSession, type AuthSession };
