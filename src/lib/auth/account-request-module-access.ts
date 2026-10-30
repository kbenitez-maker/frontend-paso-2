import type { UserMe } from '@/types/user';

/** Key of this zone inside the `modules` map returned by `users/me`. */
const ACCOUNT_REQUEST_MODULE_KEY = 'mod_jurid_acct_req_web';

/**
 * Route-level gate for the account-request zone. Query 403s stay inline; this
 * guard is the supported path to the full-screen forbidden UI.
 */
const hasAccountRequestAccess = (
  profile: Pick<UserMe, 'modules'> | undefined,
): boolean =>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, security/detect-object-injection -- fixed module key; users/me can omit modules
  profile?.modules?.[ACCOUNT_REQUEST_MODULE_KEY]?.is_active === true;

export { ACCOUNT_REQUEST_MODULE_KEY, hasAccountRequestAccess };
