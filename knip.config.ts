import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignoreExportsUsedInFile: true,
  workspaces: {
    '.': {
      ignoreDependencies: [
        /(^|\/)[^/]*eslint[^/]*(\/|$)/,
        '@lafise/onyx-system',
        'sonner',
        'tailwindcss',
        'tailwindcss-react-aria-components',
        'tw-animate-css',
        '@changesets/cli',
        // Peer dependency of the Onyx components.
        'tailwind-variants',
      ],
      ignoreBinaries: ['commitlint', 'only-allow'],
      entry: ['.commitlintrc.ts'],
      project: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}', 'contracts/**/*.ts'],
    },
  },
};

export default config;
