// cspell:ignore coleccion informacion
import type { CountryCode } from '@/types/domain';
import type { CountryCell, NormalizedType, SnapshotRow } from './schema';

import { ALWAYS } from './schema';

type RawCell = string | boolean | null;

interface RawSheet {
  name: string;
  /** Header cells by column index (row 1). */
  header: RawCell[];
  /** Data rows with their 1-based sheet row number. */
  rows: { number: number; cells: RawCell[] }[];
}

interface ColumnMap {
  label: number;
  type: number;
  group: number | null;
  category: number | null;
  notes: number | null;
  applies: [CountryCode, number][];
  visibility: [CountryCode, number][];
}

/** Bank column suffix to country code (`BLRD` is the Dominican Republic). */
const COUNTRY_BY_BANK: Record<string, CountryCode> = {
  NI: 'NI',
  PA: 'PA',
  CR: 'CR',
  RD: 'DO',
  HN: 'HN',
  SV: 'SV',
};

const TYPE_BY_LABEL: Record<string, NormalizedType> = {
  entero: 'integer',
  decimal: 'decimal',
  texto: 'text',
  catalogo: 'catalog',
  fecha: 'date',
  coleccion: 'collection',
  'multi-catalogo': 'multi_catalog',
  'multi-checkbox': 'multi_checkbox',
  booleano: 'boolean',
  checkbox: 'checkbox',
  correo: 'email',
  'grupo de informacion': 'group',
  'multi-texto': 'multi_text',
};

const ALWAYS_VISIBLE =
  /^(?:siempre visible|visible siempre|se muestra siempre)$/i;
const COLLECTION_MARKER = /\[(inicio|fin)\]\s*$/i;

const clean = (value: RawCell | undefined): string =>
  typeof value === 'string' ? value.replaceAll(/\s+/g, ' ').trim() : '';

const normalizeType = (raw: string): NormalizedType => {
  const key = raw
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/\s*-\s*/g, '-');
  const type =
    Object.hasOwn(TYPE_BY_LABEL, key) ? TYPE_BY_LABEL[key] : undefined;
  if (type === undefined) throw new Error(`Unknown data type "${raw}"`);
  return type;
};

const normalizeVisibility = (raw: string): string | null => {
  if (raw === '') return null;
  return ALWAYS_VISIBLE.test(raw) ? ALWAYS : raw;
};

const countryOf = (bank: string | undefined): CountryCode | undefined =>
  bank !== undefined && Object.hasOwn(COUNTRY_BY_BANK, bank) ?
    COUNTRY_BY_BANK[bank]
  : undefined;

const mapColumns = (sheet: RawSheet): ColumnMap => {
  const columns: ColumnMap = {
    label: -1,
    type: -1,
    group: null,
    category: null,
    notes: null,
    applies: [],
    visibility: [],
  };

  sheet.header.forEach((cell, index) => {
    const name = clean(cell);
    const visibility = /^Visibilidad BL([A-Z]{2})$/.exec(name)?.[1];
    const bank = /^BL([A-Z]{2})$/.exec(name)?.[1];
    const visibilityCountry = countryOf(visibility);
    const bankCountry = countryOf(bank);
    if (visibilityCountry !== undefined) {
      columns.visibility.push([visibilityCountry, index]);
    } else if (bankCountry !== undefined) {
      columns.applies.push([bankCountry, index]);
    } else if (name === 'Nombre del campo') columns.label = index;
    else if (name === 'Tipo de dato') columns.type = index;
    else if (name === 'Grupo de Datos') columns.group = index;
    else if (name === 'Categoría') columns.category = index;
    else if (/^Información Complementaria$/i.test(name)) columns.notes = index;
  });

  if (columns.label < 0 || columns.type < 0) {
    throw new Error(`Tab "${sheet.name}" lacks the field name/type columns`);
  }
  return columns;
};

const ORDER: readonly CountryCode[] = ['NI', 'PA', 'CR', 'HN', 'SV', 'DO'];

const buildCountries = (
  columns: ColumnMap,
  cells: RawCell[],
): Partial<Record<CountryCode, CountryCell>> => {
  const result: Partial<Record<CountryCode, CountryCell>> = {};
  for (const country of ORDER) {
    const applies = columns.applies.find(([code]) => code === country);
    const visibility = columns.visibility.find(([code]) => code === country);
    if (applies === undefined && visibility === undefined) continue;
    result[country] = {
      applies: applies !== undefined && cells[applies[1]] === true,
      visibility:
        visibility === undefined ? null : (
          normalizeVisibility(clean(cells[visibility[1]]))
        ),
    };
  }
  return result;
};

const textOrNull = (value: string): string | null =>
  value === '' ? null : value;

/**
 * Turns one raw tab into long-format rows. Country columns are bound by header
 * name (their order differs per tab); rows without a type are section headers
 * and `[Inicio]`/`[Fin]` rows bracket collections (nested ones join with ` > `).
 */
const normalizeSheet = (sheet: RawSheet): SnapshotRow[] => {
  const columns = mapColumns(sheet);
  const rows: SnapshotRow[] = [];
  let sectionHeader: string | null = null;
  const open: string[] = [];

  for (const { number, cells } of sheet.rows) {
    const label = clean(cells[columns.label]);
    if (label === '') continue;

    const rawType = clean(cells[columns.type]);
    if (rawType === '') {
      sectionHeader = label;
      continue;
    }

    const marker = COLLECTION_MARKER.exec(label)?.[1]?.toLowerCase();
    const name = label.replace(COLLECTION_MARKER, '').trim();
    if (marker === 'inicio') open.push(name);

    rows.push({
      tab: sheet.name,
      row: number,
      section_header: sectionHeader,
      collection: open.length === 0 ? null : open.join(' > '),
      label,
      raw_type: rawType,
      normalized_type: normalizeType(rawType),
      data_group:
        columns.group === null ? null : textOrNull(clean(cells[columns.group])),
      countries: buildCountries(columns, cells),
      category:
        columns.category === null ?
          null
        : textOrNull(clean(cells[columns.category])),
      notes:
        columns.notes === null ? null : textOrNull(clean(cells[columns.notes])),
    });

    if (marker === 'fin') {
      // An unmatched `[Fin]` closes the innermost collection.
      const index = open.lastIndexOf(name);
      open.splice(index < 0 ? open.length - 1 : index);
    }
  }

  return rows;
};

const compareText = (a: string, b: string): number =>
  a < b ? -1
  : a > b ? 1
  : 0;

/** Stable order: tab name, then sheet row. */
const sortRows = (rows: SnapshotRow[]): SnapshotRow[] =>
  rows.toSorted((a, b) => compareText(a.tab, b.tab) || a.row - b.row);

export { normalizeSheet, sortRows, type RawCell, type RawSheet };
