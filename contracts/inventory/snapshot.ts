import { writeFile } from 'node:fs/promises';

import type { CellValue, Row } from 'exceljs';
import type { RawCell, RawSheet } from './normalize';
import type { Snapshot } from './schema';

import ExcelJS from 'exceljs';

import { SNAPSHOT_PATH, SOURCE_PATH } from './files';
import { formatSource } from './format';
import { normalizeSheet, sortRows } from './normalize';

/**
 * Plain text of a cell value. `cell.text` stringifies rich text inside merged
 * and hyperlink cells as `[object Object]`, so unwrap those shapes here.
 */
const valueText = (value: CellValue): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return String(value);
  if ('richText' in value)
    return value.richText.map((run) => run.text).join('');
  if ('hyperlink' in value) return valueText(value.text);
  if ('formula' in value || 'sharedFormula' in value) {
    return valueText(value.result ?? null);
  }
  if ('error' in value) return value.error;
  return '';
};

const toRawCells = (row: Row, width: number): RawCell[] =>
  Array.from({ length: width }, (_, index) => {
    // A merged cell's value is its master's value.
    const { value } = row.getCell(index + 1).master;
    return typeof value === 'boolean' ? value : valueText(value);
  });

const readSheets = async (file: string): Promise<RawSheet[]> => {
  // exceljs is CommonJS: Node cannot see its named exports under ESM.
  // eslint-disable-next-line import-x/no-named-as-default-member
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);

  return workbook.worksheets
    .filter((sheet) => sheet.state === 'visible')
    .map((sheet) => {
      const width = sheet.columnCount;
      const rows: RawSheet['rows'] = [];
      sheet.eachRow((row, number) => {
        if (number > 1) rows.push({ number, cells: toRawCells(row, width) });
      });
      return {
        name: sheet.name.trim(),
        header: toRawCells(sheet.getRow(1), width),
        rows,
      };
    });
};

const buildSnapshot = async (): Promise<Snapshot> => {
  const sheets = await readSheets(SOURCE_PATH);
  return { rows: sortRows(sheets.flatMap(normalizeSheet)) };
};

const run = async (): Promise<void> => {
  const snapshot = await buildSnapshot();
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  await writeFile(SNAPSHOT_PATH, await formatSource(json, SNAPSHOT_PATH));

  const perTab = new Map<string, number>();
  for (const row of snapshot.rows) {
    perTab.set(row.tab, (perTab.get(row.tab) ?? 0) + 1);
  }
  console.table(Object.fromEntries(perTab));
  console.log(`snapshot.json: ${String(snapshot.rows.length)} rows`);
};

await run();
