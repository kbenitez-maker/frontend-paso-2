import type {
  CatalogRef,
  FieldDefinition,
  RequiredSpec,
  Rule,
  VisibilityExpr,
  VisibleWhen,
} from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type {
  Overlay,
  OverlayEntry,
  OverlayField,
  Snapshot,
  SnapshotRow,
} from './schema';

import { isBlockOf } from '@/lib/constants/steps';
import { EXTERNAL_CONTEXT_KEYS } from '@/lib/related-parties';
import { COUNTRY_CODES } from '@/types/domain';

/** UI copy of a field; fields with a `variant` have one label per variant. */
interface FieldLabel {
  /** i18n key: the field key, or `<key>_<variant>` for variant fields. */
  id: string;
  es: string;
  en?: string;
}

interface ResolvedField extends FieldDefinition {
  section: string;
  labels: FieldLabel[];
  /** Sheet row of the first entry; fixes the output order. */
  row: number;
  /** Help copy per locale, emitted next to the labels (the definition only flags `help`). */
  help_text?: { es: string; en: string };
}

interface Resolution {
  fields: ResolvedField[];
  errors: string[];
}

const isIgnore = (
  entry: OverlayEntry,
): entry is Extract<OverlayEntry, { ignore: true }> => 'ignore' in entry;

/** Rows that only bracket a collection; they carry no field of their own. */
const isCollectionMarker = (row: SnapshotRow): boolean =>
  row.normalized_type === 'collection' &&
  /\[(?:inicio|fin)\]$/i.test(row.label);

const isCountryMap = (
  rule: VisibleWhen,
): rule is Partial<Record<CountryCode, VisibilityExpr>> =>
  !('always' in rule || 'field' in rule || 'all' in rule || 'any' in rule);

const referencedFields = (expr: VisibilityExpr): string[] => {
  if ('always' in expr) return [];
  if ('all' in expr) return expr.all.flatMap(referencedFields);
  if ('any' in expr) return expr.any.flatMap(referencedFields);
  return [expr.field];
};

const visibilityReferences = (rule: VisibleWhen | undefined): string[] => {
  if (rule === undefined) return [];
  return isCountryMap(rule) ?
      Object.values(rule).flatMap(referencedFields)
    : referencedFields(rule);
};

const ruleReferences = (rules: Rule[] | undefined): string[] =>
  (rules ?? []).flatMap((rule) =>
    'gte_field' in rule ? [rule.gte_field]
    : 'lte_field' in rule ? [rule.lte_field]
    : 'sum_lte' in rule ? [...rule.sum_lte.sum, ...rule.sum_lte.limit]
    : 'any_true' in rule ? [...rule.any_true]
    : [],
  );

const appliesTo = (row: SnapshotRow): CountryCode[] =>
  COUNTRY_CODES.filter((country) => row.countries[country]?.applies === true);

const entryName = (entry: OverlayEntry): string =>
  `"${entry.label}"${entry.section_header === undefined ? '' : ` (${entry.section_header})`}${entry.row === undefined ? '' : ` [row ${String(entry.row)}]`}`;

const KEBAB_CASE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

/** Per-country `visible_when` of one entry, expanded over its countries. */
const visibilityByCountry = (
  rule: VisibleWhen | undefined,
  countries: CountryCode[],
): Partial<Record<CountryCode, VisibilityExpr>> => {
  const result: Partial<Record<CountryCode, VisibilityExpr>> = {};
  if (rule === undefined) return result;
  for (const country of countries) {
    const expr = isCountryMap(rule) ? rule[country] : rule;
    if (expr !== undefined) result[country] = expr;
  }
  return result;
};

const requiredByCountry = (
  spec: RequiredSpec,
  countries: CountryCode[],
): Partial<Record<CountryCode, boolean>> => {
  const result: Partial<Record<CountryCode, boolean>> = {};
  for (const country of countries) {
    result[country] = spec === 'when_visible' || (spec[country] ?? true);
  }
  return result;
};

const variantFor = (
  countries: CountryCode[],
  variant: string,
): Partial<Record<CountryCode, string>> => {
  const result: Partial<Record<CountryCode, string>> = {};
  for (const country of countries) result[country] = variant;
  return result;
};

interface Entry {
  field: OverlayField;
  row: SnapshotRow;
  countries: CountryCode[];
}

const labelOf = ({ field }: Entry): FieldLabel => ({
  id: field.variant === undefined ? field.key : `${field.key}_${field.variant}`,
  es: field.label_es ?? field.label,
  ...(field.label_en !== undefined && { en: field.label_en }),
});

/** Placement of a field in its item modal (tab, sub-group heading, list title). */
const itemLayoutOf = (field: OverlayField) => ({
  ...(field.item_tab !== undefined && { item_tab: field.item_tab }),
  ...(field.item_group !== undefined && { item_group: field.item_group }),
  ...(field.item_title && { item_title: true as const }),
  ...(field.person_field !== undefined && { person_field: field.person_field }),
  ...(field.identity && { identity: true as const }),
  ...(field.full_width && { full_width: true as const }),
});

const sameJson = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Merges rows that share a key over disjoint countries into one definition. */
const mergeEntries = (
  entries: [Entry, ...Entry[]],
  errors: string[],
): ResolvedField => {
  const [first] = entries;
  if (entries.length === 1) {
    const { field, row, countries } = first;
    return {
      key: field.key,
      section: field.section,
      labels: [labelOf(first)],
      block: field.block,
      row: field.sort_row ?? row.row,
      type: field.type,
      countries,
      required: field.required,
      ...(field.catalog && { catalog: field.catalog satisfies CatalogRef }),
      ...(field.visible_when && { visible_when: field.visible_when }),
      ...(field.validation && { validation: field.validation }),
      ...(field.max_length !== undefined && { max_length: field.max_length }),
      ...(field.multiline && { multiline: true }),
      ...(field.preload_from && { preload_from: field.preload_from }),
      ...(field.help && { help: true as const, help_text: field.help }),
      ...(field.read_only && { read_only: true }),
      ...(field.ui_only && { ui_only: true }),
      ...(field.collection && { collection: field.collection }),
      ...itemLayoutOf(field),
      ...(field.variant && { variant: variantFor(countries, field.variant) }),
    };
  }

  const seen = new Set<CountryCode>();
  for (const { field, countries } of entries) {
    for (const country of countries) {
      if (seen.has(country)) {
        errors.push(
          `Key "${first.field.key}" in ${first.field.section}: ${country} is mapped by more than one row`,
        );
      }
      seen.add(country);
    }
    if (
      field.type !== first.field.type ||
      !sameJson(field.catalog, first.field.catalog) ||
      !sameJson(field.validation, first.field.validation) ||
      field.max_length !== first.field.max_length ||
      field.multiline !== first.field.multiline ||
      field.collection !== first.field.collection ||
      !sameJson(itemLayoutOf(field), itemLayoutOf(first.field))
    ) {
      errors.push(
        `Key "${field.key}" in ${field.section}: merged rows must share type, catalog, validation, max_length, multiline and item layout`,
      );
    }
    if (field.block !== first.field.block) {
      errors.push(`Key "${field.key}": merged rows must share the block`);
    }
    if (field.variant === undefined) {
      errors.push(`Key "${field.key}": merged rows need a variant`);
    }
  }

  const countries = COUNTRY_CODES.filter((country) => seen.has(country));
  const required: Partial<Record<CountryCode, boolean>> = {};
  const visibility: Partial<Record<CountryCode, VisibilityExpr>> = {};
  const variant: Partial<Record<CountryCode, string>> = {};
  for (const entry of entries) {
    Object.assign(
      required,
      requiredByCountry(entry.field.required, entry.countries),
    );
    Object.assign(
      visibility,
      visibilityByCountry(entry.field.visible_when, entry.countries),
    );
    for (const country of entry.countries) {
      if (entry.field.variant !== undefined)
        variant[country] = entry.field.variant;
    }
  }

  return {
    key: first.field.key,
    section: first.field.section,
    labels: entries.map(labelOf),
    block: first.field.block,
    row: Math.min(
      ...entries.map((entry) => entry.field.sort_row ?? entry.row.row),
    ),
    type: first.field.type,
    countries,
    required:
      Object.values(required).every(Boolean) ? 'when_visible' : required,
    ...(first.field.catalog && { catalog: first.field.catalog }),
    ...(Object.keys(visibility).length > 0 && { visible_when: visibility }),
    ...(first.field.validation && { validation: first.field.validation }),
    ...(first.field.max_length !== undefined && {
      max_length: first.field.max_length,
    }),
    ...(first.field.multiline && { multiline: true }),
    ...(first.field.help && {
      help: true as const,
      help_text: first.field.help,
    }),
    ...(first.field.collection && { collection: first.field.collection }),
    ...itemLayoutOf(first.field),
    variant,
  };
};

/**
 * Validates an overlay against the snapshot and resolves it into field
 * definitions. Errors are collected, not thrown, so `check` can print all.
 */
/**
 * `foreignKeys` are the field keys of the other overlays: a validation rule
 * may compare against them (the API passes the other sections as context),
 * a visibility condition may not.
 */
const resolveOverlay = (
  overlay: Overlay,
  snapshot: Snapshot,
  foreignKeys: ReadonlySet<string> = new Set(),
): Resolution => {
  const errors: string[] = [];
  const rows = snapshot.rows.filter((row) => overlay.tabs.includes(row.tab));
  for (const tab of overlay.tabs) {
    if (!rows.some((row) => row.tab === tab))
      errors.push(`Tab "${tab}" is not in the snapshot`);
  }

  const claimed = new Map<SnapshotRow, OverlayEntry>();
  const entries: Entry[] = [];

  for (const entry of overlay.entries) {
    if (!overlay.tabs.includes(entry.tab)) {
      errors.push(
        `Tab "${entry.tab}" is not listed in the overlay: ${entryName(entry)}`,
      );
      continue;
    }
    if (!isIgnore(entry) && entry.poc_only) {
      if (
        entry.countries === undefined ||
        entry.sort_row === undefined ||
        entry.note === undefined
      ) {
        errors.push(
          `${entryName(entry)}: poc_only needs countries, sort_row and a note`,
        );
        continue;
      }
      entries.push({
        field: entry,
        // No sheet row: a stand-in placed at `sort_row`, outside any sheet collection.
        row: {
          tab: entry.tab,
          row: entry.sort_row,
          section_header: null,
          collection: null,
          label: entry.label,
          raw_type: '',
          normalized_type: 'text',
          data_group: null,
          countries: {},
          category: null,
          notes: null,
        },
        countries: COUNTRY_CODES.filter((code) =>
          entry.countries?.includes(code),
        ),
      });
      continue;
    }
    const candidates = rows.filter(
      (row) =>
        row.tab === entry.tab &&
        row.label === entry.label &&
        (entry.section_header === undefined ||
          row.section_header === entry.section_header) &&
        (entry.row === undefined || row.row === entry.row),
    );
    const [row, ...others] = candidates;
    if (row === undefined || others.length > 0) {
      errors.push(
        row === undefined ?
          `Overlay label not in snapshot: ${entryName(entry)}`
        : `Overlay label is ambiguous (add section_header or row): ${entryName(entry)}`,
      );
      continue;
    }
    if (claimed.has(row)) {
      errors.push(`Snapshot row is mapped twice: ${entryName(entry)}`);
      continue;
    }
    claimed.set(row, entry);
    if (!isIgnore(entry)) {
      if (
        (entry.countries !== undefined || entry.sort_row !== undefined) &&
        entry.note === undefined
      ) {
        errors.push(`${entryName(entry)}: countries and sort_row need a note`);
      }
      entries.push({
        field: entry,
        row,
        countries:
          entry.countries === undefined ?
            appliesTo(row)
          : COUNTRY_CODES.filter((code) => entry.countries?.includes(code)),
      });
    }
  }

  // An overlay with no entries yet is a registered placeholder: nothing to map.
  for (const row of overlay.entries.length === 0 ? [] : rows) {
    if (!claimed.has(row) && !isCollectionMarker(row)) {
      errors.push(
        `Unmapped snapshot row ${row.tab}/${String(row.row)}: "${row.label}"`,
      );
    }
  }

  const groups = new Map<string, [Entry, ...Entry[]]>();
  for (const entry of entries) {
    const id = `${entry.field.section}/${entry.field.key}`;
    const group = groups.get(id);
    if (group === undefined) groups.set(id, [entry]);
    else group.push(entry);
  }
  const fields = [...groups.values()].map((group) =>
    mergeEntries(group, errors),
  );
  fields.sort((a, b) => a.row - b.row);

  const keys = new Set(fields.map((field) => field.key));
  if (keys.size !== fields.length) {
    const sections = new Map<string, Set<string>>();
    for (const field of fields) {
      sections.set(
        field.key,
        (sections.get(field.key) ?? new Set()).add(field.section),
      );
    }
    for (const [key, where] of sections) {
      if (where.size > 1)
        errors.push(`Key "${key}" is used by several sections`);
    }
  }
  const collections = new Map<string, string>();
  const limits = overlay.collections ?? {};
  /** The collection and its ancestors, top first: `[]`, `[name]` or `[parent, name]`. */
  const chainOf = (name: string | undefined): string[] => {
    if (name === undefined) return [];

    const parent = limits[name]?.parent;
    return parent === undefined ? [name] : [parent, name];
  };

  for (const entry of entries) {
    const { field, row, countries } = entry;
    const where = `${field.section}/${field.key}`;

    if (countries.length === 0) errors.push(`${where}: applies to no country`);
    if (!KEBAB_CASE.test(field.section) || field.section === overlay.name) {
      errors.push(
        `${where}: section must be kebab-case and differ from the step slug`,
      );
    }
    if (!isBlockOf(overlay.name, field.block)) {
      errors.push(
        `${where}: block "${String(field.block)}" is not a block of ${overlay.name}`,
      );
    }

    for (const country of Object.keys(
      typeof field.required === 'string' ? {} : field.required,
    )) {
      if (!countries.some((code) => code === country)) {
        errors.push(
          `${where}: required lists ${country}, which does not apply`,
        );
      }
    }
    if (field.visible_when !== undefined && isCountryMap(field.visible_when)) {
      for (const country of Object.keys(field.visible_when)) {
        if (!countries.some((code) => code === country)) {
          errors.push(
            `${where}: visible_when lists ${country}, which does not apply`,
          );
        }
      }
    }

    const catalogTypes = ['catalog', 'multi_catalog'];
    if (catalogTypes.includes(field.type) !== (field.catalog !== undefined)) {
      errors.push(`${where}: catalog is required for catalog types only`);
    }
    const parent = field.catalog?.parent;
    const parents =
      parent === undefined ? []
      : typeof parent === 'string' ? [parent]
      : Object.values(parent);
    const countryFrom = field.catalog?.country_from;
    for (const key of countryFrom === undefined ? parents : (
      [...parents, countryFrom]
    )) {
      if (
        !fields.some(
          (other) => other.key === key && other.section === field.section,
        )
      ) {
        errors.push(
          `${where}: catalog parent/country field "${key}" not found in section`,
        );
      }
    }
    if (field.catalog?.hide_when_empty && parent === undefined) {
      errors.push(`${where}: hide_when_empty requires a catalog parent`);
    }
    for (const ref of visibilityReferences(field.visible_when)) {
      if (!keys.has(ref) && !EXTERNAL_CONTEXT_KEYS.includes(ref))
        errors.push(`${where}: references unknown field "${ref}"`);
    }
    for (const ref of ruleReferences(field.validation)) {
      if (!keys.has(ref) && !foreignKeys.has(ref))
        errors.push(`${where}: references unknown field "${ref}"`);
    }
    if (
      field.max_length !== undefined &&
      field.type !== 'string' &&
      field.type !== 'email' &&
      field.type !== 'url'
    ) {
      errors.push(`${where}: max_length requires a text type`);
    }
    for (const key of ['item_tab', 'item_group', 'item_title'] as const) {
      if (
        field[key] !== undefined &&
        (field.collection === undefined ||
          limits[field.collection]?.parent !== undefined)
      ) {
        errors.push(
          `${where}: ${key} requires a top-level collection${key === 'item_title' ? '' : ` (child collections take collections.<key>.${key})`}`,
        );
      }
    }
    if (field.multiline && field.type !== 'string') {
      errors.push(`${where}: multiline requires type string`);
    }
    if (
      (field.validation ?? []).some((rule) => 'min' in rule || 'max' in rule) &&
      field.type !== 'integer' &&
      field.type !== 'decimal'
    ) {
      errors.push(`${where}: min/max require a numeric type`);
    }

    const chain = chainOf(field.collection);
    const path = row.collection?.split(' > ') ?? [];
    if (field.regrouped) {
      if (field.note === undefined) {
        errors.push(`${where}: regrouped requires a note saying why`);
      }
    } else if (
      chain.length === 0 ? path.length > 0 : path.length < chain.length
    ) {
      errors.push(
        `${where}: collection must match the snapshot (${row.collection ?? 'none'})`,
      );
    } else {
      // Tabs reuse sheet collection names ("Datos de Relacionados"), so consistency is per tab.
      // The sheet may nest deeper than the overlay (a missing [Fin]), so only the top collection
      // and, for child fields, the full sheet path must map to one overlay key.
      const claim = (sheetCollection: string, key: string) => {
        const known = collections.get(sheetCollection);
        if (known !== undefined && known !== key) {
          errors.push(
            `${where}: collection "${row.collection ?? ''}" is named inconsistently`,
          );
        }
        collections.set(sheetCollection, key);
      };
      const [top, child] = chain;
      if (top !== undefined) claim(`${row.tab}/${path[0] ?? ''}`, top);
      if (child !== undefined) claim(`${row.tab}/${path.join(' > ')}`, child);
    }
    // Conditions see the section scope plus, inside a collection, the fields of the same item and of its parent item.
    if (
      visibilityReferences(field.visible_when).some((ref) =>
        entries.some(
          (other) =>
            other.field.key === ref &&
            other.field.collection !== undefined &&
            !chain.includes(other.field.collection),
        ),
      )
    ) {
      errors.push(
        `${where}: conditions may reference section fields or fields of the same collection item (or its parent item) only`,
      );
    }
  }

  // Parent and limits travel on every item field: the schema and the list read them there.
  for (const [
    name,
    { min_items: min = 0, max_items: max, parent },
  ] of Object.entries(limits)) {
    const members = fields.filter((field) => field.collection === name);
    if (members.length === 0) {
      errors.push(`Collection "${name}" has no fields in ${overlay.name}`);
    }
    if (
      !Number.isInteger(min) ||
      min < 0 ||
      (max !== undefined && (!Number.isInteger(max) || max < Math.max(min, 1)))
    ) {
      errors.push(
        `Collection "${name}": min_items and max_items must be integers with 0 <= min_items <= max_items`,
      );
    }
    if (parent !== undefined) {
      const owner = fields.find((field) => field.collection === parent);

      if (owner === undefined || limits[parent]?.parent !== undefined) {
        errors.push(
          `Collection "${name}": parent "${parent}" must be a top-level collection of ${overlay.name}`,
        );
      }
      if (
        owner !== undefined &&
        members.some(
          (field) =>
            field.section !== owner.section || field.block !== owner.block,
        )
      ) {
        errors.push(
          `Collection "${name}": its fields must share the section and block of "${parent}"`,
        );
      }
    }
    const when = limits[name]?.min_items_when_any;
    if (
      when !== undefined &&
      referencedFields(when.item).some(
        (key) => !members.some((field) => field.key === key),
      )
    ) {
      errors.push(
        `Collection "${name}": min_items_when_any may only read fields of its items`,
      );
    }
    const sole = limits[name]?.sole_item_not;
    if (
      sole !== undefined &&
      [...referencedFields(sole.item), ...referencedFields(sole.not)].some(
        (key) => !members.some((field) => field.key === key),
      )
    ) {
      errors.push(
        `Collection "${name}": sole_item_not may only read fields of its items`,
      );
    }
    for (const field of members) {
      if (when !== undefined) field.min_items_when_any = when;
      if (sole !== undefined) field.sole_item_not = sole;
      if (min > 0) field.min_items = min;
      if (max !== undefined) field.max_items = max;
      if (parent !== undefined) field.parent_collection = parent;
    }
  }

  // Item layout: a child collection takes the tab (and sub-group) of the parent modal that lists
  // it, and in a tabbed collection every child list needs a tab (own fields may stay above the tabs).
  for (const [
    name,
    { parent, item_tab: tab, item_group: group },
  ] of Object.entries(limits)) {
    if (tab === undefined && group === undefined) continue;
    if (parent === undefined) {
      errors.push(
        `Collection "${name}": item_tab and item_group are for child collections; top-level fields set their own`,
      );
      continue;
    }
    for (const field of fields) {
      if (field.collection !== name) continue;
      if (tab !== undefined) field.item_tab = tab;
      if (group !== undefined) field.item_group = group;
    }
  }
  const tabbed = new Set(
    fields.flatMap((field) =>
      field.item_tab === undefined ?
        []
      : [field.parent_collection ?? field.collection],
    ),
  );
  const missingTabs = new Set<string>();
  for (const field of fields) {
    const top = field.parent_collection;
    if (top !== undefined && tabbed.has(top) && field.item_tab === undefined) {
      missingTabs.add(
        `Collection "${String(field.collection)}": needs collections.${String(field.collection)}.item_tab, "${top}" has tabs`,
      );
    }
  }
  errors.push(...missingTabs);

  return { fields, errors };
};

export { resolveOverlay, type FieldLabel, type ResolvedField, type Resolution };
