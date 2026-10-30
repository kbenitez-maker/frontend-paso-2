import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT } from './files';
import { buildOutputs } from './outputs';

const PREVIEW_LINES = 5;

const readOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
};

/** First differing lines, enough to see what drifted. */
const summarize = (expected: string, actual: string | null): string[] => {
  if (actual === null) return ['  missing file'];
  const want = expected.split('\n');
  const have = actual.split('\n');
  const lines: string[] = [];
  for (let index = 0; index < Math.max(want.length, have.length); index++) {
    if (want[index] === have[index]) continue;
    lines.push(
      `  line ${String(index + 1)}:`,
      `    - ${have[index] ?? '(none)'}`,
      `    + ${want[index] ?? '(none)'}`,
    );
    if (lines.length >= PREVIEW_LINES * 3) break;
  }
  return lines;
};

const { files, errors } = await buildOutputs();
const problems = errors.map((error) => `overlay: ${error}`);

for (const [file, expected] of files) {
  const actual = await readOrNull(path.join(REPO_ROOT, file));
  if (actual !== expected) {
    problems.push(`out of date: ${file}`, ...summarize(expected, actual));
  }
}

if (problems.length > 0) {
  console.error(
    `${problems.join('\n')}\n\nRun \`pnpm contracts:generate\` and include the result in the change.`,
  );
  process.exit(1);
}

console.log(`contracts up to date (${String(files.size)} files)`);
