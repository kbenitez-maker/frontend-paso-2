import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT } from './files';
import { buildOutputs } from './outputs';

// `pnpm contracts:generate <step> [...]` builds only those overlays.
const only = process.argv.slice(2);
const { files, errors, untranslated } = await buildOutputs(
  only.length > 0 ? only : undefined,
);

if (errors.length > 0) {
  console.error(
    `Overlay validation failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
  );
  process.exit(1);
}

for (const [file, content] of files) {
  const target = path.join(REPO_ROOT, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  console.log(`generated ${file}`);
}

for (const [name, ids] of untranslated) {
  console.log(`${name}: ${String(ids.length)} labels without English copy`);
}
