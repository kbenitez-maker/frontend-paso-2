/** True when every letter in the label is uppercase (non-letters ignored). */
const isAllCapsLabel = (name: string, locale: string): boolean => {
  for (const char of name) {
    if (!/\p{L}/u.test(char)) continue;
    if (char !== char.toLocaleUpperCase(locale)) return false;
  }
  return true;
};

/** Catalog and tax identifiers that stay uppercase inside ALL CAPS API labels. */
const PRESERVED_ACRONYMS = new Set([
  'DV',
  'LTDA',
  'NIT',
  'NRC',
  'RNC',
  'RTN',
  'RUC',
  'SA',
]);

const isUppercaseToken = (word: string, locale: string): boolean => {
  let letters = 0;
  for (const char of word) {
    if (!/\p{L}/u.test(char)) continue;
    letters += 1;
    if (char !== char.toLocaleUpperCase(locale)) return false;
  }
  return letters > 0;
};

/** Keeps dotted forms (e.g. S.A.), listed acronyms, and ALL CAPS tokens with apostrophes. */
const preserveAllCapsWord = (word: string, locale: string): boolean => {
  if (word.includes('.')) return true;
  if (PRESERVED_ACRONYMS.has(word)) return true;
  return word.includes("'") && isUppercaseToken(word, locale);
};

const titleCaseWord = (word: string, locale: string): string => {
  if (preserveAllCapsWord(word, locale)) return word;
  const lower = word.toLocaleLowerCase(locale);
  const [first, ...rest] = lower;
  if (first === undefined) return word;
  return first.toLocaleUpperCase(locale) + rest.join('');
};

/**
 * Title-cases each whitespace-separated word for catalog labels (API names often
 * arrive in ALL CAPS, e.g. `SUCURSAL CHIQUIRI` → `Sucursal Chiquiri`).
 * Dotted suffixes and short acronyms stay as returned by the API.
 * Names that already use mixed or lowercase letters are left unchanged.
 */
const normalizeCatalogDisplayName = (name: string, locale: string): string => {
  const trimmed = name.trim();
  if (trimmed === '') return trimmed;
  if (!isAllCapsLabel(trimmed, locale)) return trimmed;

  return trimmed
    .split(/\s+/u)
    .map((word) => titleCaseWord(word, locale))
    .join(' ');
};

export { normalizeCatalogDisplayName };
