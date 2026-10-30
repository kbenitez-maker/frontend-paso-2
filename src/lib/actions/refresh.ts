import { createRefreshServerActions } from '@lafise/lde-web-core/server';
import { ChannelId } from '@lafise/lde-web-lib';

import { env } from '@/lib/env';

/**
 * Bound Server Action pair produced by
 * `@lafise/lde-web-core/server::createRefreshServerActions`.
 *
 * Same module-scope binding pattern as `@/lib/actions/logout`: the kit
 * factory returns server references that cross the RSC boundary as props
 * into the client session component. This file intentionally omits `'use server'`
 * to avoid the `$$id` collision from re-registering already-bound actions.
 */
const { getSessionExpiryAction, refreshSessionAction } =
  createRefreshServerActions({
    apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
    apiKey: env.NEXT_PUBLIC_X_API_KEY,
    channelId: ChannelId.Web,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    },
  });

export { getSessionExpiryAction, refreshSessionAction };
