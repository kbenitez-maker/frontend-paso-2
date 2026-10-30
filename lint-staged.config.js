const config = {
  '*': [
    'cspell --no-must-find-files',
    'prettier --ignore-unknown --list-different',
  ],
  '**/*.{ts,tsx,js,jsx,cjs,mjs}': ['eslint --max-warnings 0 --no-warn-ignored'],
  '**/*.{md,mdx}': ['markdownlint'],
};

export default config;
