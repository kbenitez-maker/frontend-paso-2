import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Snapshot } from './schema';

import { snapshotSchema } from './schema';

const INVENTORY_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(INVENTORY_DIR, '..', '..');
const SOURCE_PATH = path.join(INVENTORY_DIR, 'source', 'inventario.xlsx');
const SNAPSHOT_PATH = path.join(INVENTORY_DIR, 'snapshot.json');

const readSnapshot = async (): Promise<Snapshot> =>
  snapshotSchema.parse(JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')));

export { REPO_ROOT, SNAPSHOT_PATH, SOURCE_PATH, readSnapshot };
