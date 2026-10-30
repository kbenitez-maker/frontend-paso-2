import { format, resolveConfig } from 'prettier';

/** Formats generated output with the repo's Prettier config. */
const formatSource = async (
  source: string,
  filepath: string,
): Promise<string> =>
  format(source, { ...(await resolveConfig(filepath)), filepath });

export { formatSource };
