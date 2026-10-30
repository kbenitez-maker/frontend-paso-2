import type { UserNavigationProfileResponse } from '@lafise/lde-web-core';

/**
 * `users/me` payload. The same response the App Shell consumes: identity,
 * navigation modules and the session policy. Access to this zone is the
 * `mod_jurid_acct_req_web` module being active.
 */
type UserMe = UserNavigationProfileResponse;

export type { UserMe };
