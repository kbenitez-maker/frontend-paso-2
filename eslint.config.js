import path from 'node:path';

import { globalIgnores } from 'eslint/config';

import { configs, defineConfig } from '@lafise/onyx-eslint';

const FEATURE_INTERNALS = {
  group: ['@/features/*/*'],
  message:
    'Import a feature through its index (`@/features/<name>`), never its internals.',
};

const SHARED_MUST_NOT_IMPORT_FEATURES = {
  group: ['@/features', '@/features/**'],
  message: 'shared/ is feature-agnostic and cannot import from features/.',
};

const RAW_DS_ELEMENTS = '^(p|span|button|input|a|img|label|h[1-6])$';

export default defineConfig(
  ...configs.base,
  ...configs.next,
  ...configs.tailwindCSS,
  ...configs.vitest,

  {
    settings: {
      'better-tailwindcss': {
        entryPoint: path.join(import.meta.dirname, 'src/styles/index.css'),
      },
    },
  },

  // Dependency direction: app -> features -> shared -> lib/server/types.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [FEATURE_INTERNALS] }],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [FEATURE_INTERNALS, SHARED_MUST_NOT_IMPORT_FEATURES] },
      ],
    },
  },

  // Onyx is the single source of the design system: text, controls, links and
  // images come from `@lafise/onyx-ui` (or `next/image`), never raw tags.
  // Layout `div`s and semantic lists stay as they are.
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/tests/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXOpeningElement[name.name=/${RAW_DS_ELEMENTS}/]`,
          message:
            'Use Onyx instead of raw HTML: Text (as/size), Heading, Button, Link, Avatar, TextField, Checkbox, or next/image. Layout divs are fine.',
        },
      ],
    },
  },

  // Contract tooling and runtime evaluator index objects by dynamic, validated
  // keys; the generator scripts read and write files by computed path.
  {
    files: ['contracts/**/*.ts', 'src/contracts/**/*.ts'],
    rules: { 'security/detect-object-injection': 'off' },
  },
  {
    files: ['contracts/**/*.ts'],
    rules: { 'security/detect-non-literal-fs-filename': 'off' },
  },

  globalIgnores(['next-env.d.ts', 'coverage', 'reports']),
);
