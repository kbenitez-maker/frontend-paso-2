import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import { loggerNextEnv } from '@lafise/onyx-env/logger/next';
import { sharedEnv } from '@lafise/onyx-env/shared';

export const env = createEnv({
  extends: [sharedEnv, loggerNextEnv],
  client: {
    NEXT_PUBLIC_API_BASE_URL: z.url(),
    NEXT_PUBLIC_X_API_KEY: z.string().min(1),
    /** Home zone URL: absolute (local, other port) or a host path. Unset = `/home`. */
    NEXT_PUBLIC_HOME_URL: z
      .union([z.url(), z.string().startsWith('/')])
      .optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_BASE_URL: process.env['NEXT_PUBLIC_API_BASE_URL'],
    NEXT_PUBLIC_X_API_KEY: process.env['NEXT_PUBLIC_X_API_KEY'],
    NEXT_PUBLIC_HOME_URL: process.env['NEXT_PUBLIC_HOME_URL'],
  },
  skipValidation: true,
});
