import { emitOverlay, untranslatedLabels } from './emit';
import { readSnapshot } from './files';
import { overlays } from './overlay';
import { resolveOverlay } from './resolve';

interface Outputs {
  /** Repo-relative path to file content. */
  files: Map<string, string>;
  errors: string[];
  /** Overlay name to the label ids that still have no English copy. */
  untranslated: Map<string, string[]>;
}

/**
 * Validates the overlays against the snapshot and renders generated files.
 * `only` limits the run to those overlay names (each overlay writes only its
 * own files); without it every overlay is built.
 */
const buildOutputs = async (only?: readonly string[]): Promise<Outputs> => {
  const snapshot = await readSnapshot();
  const files = new Map<string, string>();
  const errors: string[] = [];
  const untranslated = new Map<string, string[]>();
  /** Section key to the overlay that saves into it. */
  const owners = new Map<string, string>();
  for (const name of only ?? []) {
    if (!overlays.some((overlay) => overlay.name === name)) {
      errors.push(`unknown overlay "${name}"`);
    }
  }

  for (const overlay of overlays) {
    if (only !== undefined && !only.includes(overlay.name)) continue;
    const foreignKeys = new Set(
      overlays
        .filter((other) => other.name !== overlay.name)
        .flatMap((other) =>
          other.entries.flatMap((entry) =>
            'ignore' in entry ? [] : [entry.key],
          ),
        ),
    );
    const resolution = resolveOverlay(overlay, snapshot, foreignKeys);
    for (const { section } of resolution.fields) {
      const owner = owners.get(section);
      if (owner !== undefined && owner !== overlay.name) {
        resolution.errors.push(
          `section "${section}" is already used by the ${owner} overlay`,
        );
      }
      owners.set(section, overlay.name);
    }
    errors.push(
      ...resolution.errors.map((error) => `${overlay.name}: ${error}`),
    );
    if (resolution.errors.length > 0) continue;
    untranslated.set(overlay.name, untranslatedLabels(resolution.fields));
    for (const [file, content] of await emitOverlay(
      overlay.name,
      resolution.fields,
    )) {
      files.set(file, content);
    }
  }

  return { files, errors, untranslated };
};

export { buildOutputs };
