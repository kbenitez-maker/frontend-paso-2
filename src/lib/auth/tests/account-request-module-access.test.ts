import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_REQUEST_MODULE_KEY,
  hasAccountRequestAccess,
} from '../account-request-module-access';

const profile = (isActive: boolean) => ({
  modules: { [ACCOUNT_REQUEST_MODULE_KEY]: { is_active: isActive } },
});

describe('account-request module access', () => {
  it('grants access when the account-request module is active', () => {
    expect(hasAccountRequestAccess(profile(true))).toBe(true);
  });

  it('denies access when the module is inactive, absent, or the profile did not load', () => {
    expect(hasAccountRequestAccess(profile(false))).toBe(false);
    expect(hasAccountRequestAccess({ modules: {} })).toBe(false);
    expect(hasAccountRequestAccess(undefined)).toBe(false);
  });

  it('denies access when users/me omits modules', () => {
    expect(hasAccountRequestAccess({} as never)).toBe(false);
    expect(hasAccountRequestAccess({ modules: null } as never)).toBe(false);
  });
});
