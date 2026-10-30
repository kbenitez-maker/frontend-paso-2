import { defineConfig, mergeConfig } from 'vitest/config';

import onyxConfig from '@lafise/onyx-vitest';

export default mergeConfig(
  onyxConfig,
  defineConfig({
    test: {
      setupFiles: ['test/setup.ts'],
      // Form and generator tests take 3-5s on a loaded CI runner (Node 24);
      // the 5s default made them fail intermittently.
      testTimeout: 15_000,
      // Skip the runtime env validation in `@lafise/lde-web-env` (used
      // transitively by `@lafise/lde-web-lib` / `@lafise/lde-web-core`).
      env: {
        SKIP_ENV_VALIDATION: 'true',
      },
      // `@lafise/lde-web-env` ships raw `.ts` source; Node 22+ refuses to strip
      // types inside `node_modules`, so route the Lafise packages through
      // Vite's transform pipeline instead.
      server: {
        deps: {
          inline: [
            '@lafise/lde-web-core',
            '@lafise/lde-web-lib',
            '@lafise/lde-web-env',
            '@lafise/lde-web-auth',
          ],
        },
      },
      coverage: {
        exclude: [
          'src/types/**',
          'src/instrumentation.ts',
          'src/i18n/request.ts',
        ],
      },
    },
  }),
);
