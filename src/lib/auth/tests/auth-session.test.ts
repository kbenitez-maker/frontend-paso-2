import { describe, expect, it } from 'vitest';

import { parseAuthSession } from '../auth-session';

const SESSION = { user_id: 'u-1', access_token: 'token-1' };

describe('parseAuthSession', () => {
  it('parses raw JSON', () => {
    expect(parseAuthSession(JSON.stringify(SESSION))).toEqual({
      userId: 'u-1',
      accessToken: 'token-1',
    });
  });

  it('parses URL-encoded JSON', () => {
    expect(
      parseAuthSession(encodeURIComponent(JSON.stringify(SESSION))),
    ).toEqual({ userId: 'u-1', accessToken: 'token-1' });
  });

  it('returns an empty session for missing or invalid values', () => {
    const empty = { userId: null, accessToken: null };

    expect(parseAuthSession(undefined)).toEqual(empty);
    expect(parseAuthSession('not-json')).toEqual(empty);
    expect(parseAuthSession('%E0%A4%A')).toEqual(empty);
    expect(parseAuthSession('null')).toEqual(empty);
  });

  it('ignores fields that are not strings', () => {
    expect(parseAuthSession(JSON.stringify({ user_id: 1 }))).toEqual({
      userId: null,
      accessToken: null,
    });
  });
});
