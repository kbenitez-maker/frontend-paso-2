import type {
  CatalogParent,
  CatalogSource,
  MinItemsWhenAny,
  PreloadSource,
  Rule,
  SoleItemNot,
  VisibleWhen,
} from '@/contracts/types';
import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type {
  CountryCode,
  PersonType,
  RelatedPersonRole,
} from '@/types/domain';

import { z } from 'zod';

import { COUNTRY_CODES } from '@/types/domain';

/** Visibility sentinel for every spelling of "always visible". */
const ALWAYS = 'always';

const NORMALIZED_TYPES = [
  'integer',
  'decimal',
  'text',
  'catalog',
  'date',
  'collection',
  'multi_catalog',
  'multi_checkbox',
  'boolean',
  'checkbox',
  'email',
  'group',
  'multi_text',
] as const;

type NormalizedType = (typeof NORMALIZED_TYPES)[number];

const countryCellSchema = z.object({
  /** `true` when the sheet marks the field as applicable to the country. */
  applies: z.boolean(),
  /** Raw visibility text, or `'always'`; `null` when the sheet leaves it empty. */
  visibility: z.string().nullable(),
});

type CountryCell = z.infer<typeof countryCellSchema>;

/**
 * One typed row of the inventory (section headers are not rows).
 * `row` is the 1-based sheet row number: informational, it shifts when the
 * sheet is edited. `collection` is set between `[Inicio]` and `[Fin]`.
 */
const snapshotRowSchema = z.object({
  tab: z.string(),
  row: z.number().int(),
  section_header: z.string().nullable(),
  collection: z.string().nullable(),
  label: z.string(),
  raw_type: z.string(),
  normalized_type: z.enum(NORMALIZED_TYPES),
  data_group: z.string().nullable(),
  countries: z.partialRecord(z.enum(COUNTRY_CODES), countryCellSchema),
  category: z.string().nullable(),
  notes: z.string().nullable(),
});

const snapshotSchema = z.object({ rows: z.array(snapshotRowSchema) });

type SnapshotRow = z.infer<typeof snapshotRowSchema>;
type Snapshot = z.infer<typeof snapshotSchema>;

type OverlayFieldType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'boolean'
  | 'email'
  | 'url'
  | 'phone'
  | 'catalog'
  | 'multi_catalog';

type OverlayRequired = Partial<Record<CountryCode, boolean>> | 'when_visible';

interface OverlayCatalog {
  name: string;
  /** Field the catalog is filtered by; a per-country map when the levels differ. */
  parent?: CatalogParent;
  /** Hidden, and not required, while the chosen parent has no rows. */
  hide_when_empty?: true;
  /** Sibling field holding a country; the catalog follows it when it is a bank country (see `CatalogRef`). */
  country_from?: string;
  source: CatalogSource;
  /** `source: 'request'`: people of the request holding any of these roles (see `CatalogRef`). */
  roles?: readonly RelatedPersonRole[];
  person_type?: PersonType;
  unlisted_key?: string;
}

interface OverlayField {
  tab: string;
  /** Must match the snapshot label exactly. */
  label: string;
  /** Spanish UI copy when the sheet wording needs fixing (typos, voseo); defaults to `label`. */
  label_es?: string;
  /** English UI copy; without it the Spanish copy is emitted and reported as untranslated. */
  label_en?: string;
  /** Disambiguates labels repeated within a tab. */
  section_header?: string;
  /** Sheet row hint for labels that `section_header` cannot disambiguate; update it when the sheet shifts. */
  row?: number;
  /**
   * Position the field sorts at, as a sheet row, when the POC orders it
   * differently (fractions sit between rows, e.g. `12.5`); `note` must say why.
   */
  sort_row?: number;
  /**
   * The POC asks this field and the sheet has no row for it: `label` is not
   * matched against the snapshot, and `countries`, `sort_row` (its place) and
   * `note` are required.
   */
  poc_only?: true;
  /** Countries of the field when the POC differs from the sheet (replaces the sheet's); `note` must say why. */
  countries?: readonly CountryCode[];
  key: string;
  /** API section (kebab-case) the value is saved into; a section belongs to one overlay. */
  section: string;
  /** UI block (rail group) of the overlay's step; many blocks can save into one section. */
  block: BlockOf<StepSlug>;
  type: OverlayFieldType;
  required: OverlayRequired;
  /** Key of the embedded collection (the snapshot row must be inside one). */
  collection?: string;
  /**
   * Tab of the item modal the field shows in (top-level collections only). Once
   * one field of a collection has it, its child collections need one too; own
   * fields without one render above the tabs.
   */
  item_tab?: string;
  /** Sub-group heading of the item modal (POC `bloque`) the field sits under (top-level collections only). */
  item_group?: string;
  /** Names the item in the collection list (answered title fields joined; top-level collections only). */
  item_title?: true;
  /** Person datum the item field holds across collections of people (e.g. `first_name`); defaults to the key. */
  person_field?: string;
  /** Part of the person's identity (identification type and number): duplicates are warned, known people prefilled. */
  identity?: true;
  /** End-user help under the field (POC `ayuda` that is product copy, not a design note). */
  help?: { es: string; en: string };
  /** Takes the whole row of the form grid (POC `ancho: 'completo'`); booleans, multi catalogs and paragraphs already do. */
  full_width?: true;
  /**
   * The field deliberately sits in a different collection than the sheet
   * nests it (e.g. POC grouping the sheet lacks); `note` must say why.
   */
  regrouped?: true;
  /** Country-specific meaning when one key spans disjoint-country rows. */
  variant?: string;
  catalog?: OverlayCatalog;
  visible_when?: VisibleWhen;
  validation?: Rule[];
  max_length?: number;
  /** Free text answered in paragraphs: a full-width text area (the POC paragraph control). */
  multiline?: true;
  /** Profiling answer the API seeds the field with on request creation. */
  preload_from?: PreloadSource;
  /** Rendered disabled; the API rejects a changed value. */
  read_only?: boolean;
  ui_only?: boolean;
  note?: string;
}

/** Header-like or duplicate row that intentionally produces no field. */
interface OverlayIgnore {
  tab: string;
  label: string;
  section_header?: string;
  /** Sheet row hint, as in `OverlayField`. */
  row?: number;
  ignore: true;
  reason: string;
}

type OverlayEntry = OverlayField | OverlayIgnore;

/**
 * Nesting and item counts of one collection; without an entry a collection is
 * top-level and takes any number of items.
 */
interface OverlayCollection {
  /** Collection whose items hold this one (one nesting level): its items are edited inside the parent item. */
  parent?: string;
  /** Items needed to complete the section while the collection is visible. */
  min_items?: number;
  /** Items allowed; the add button is disabled at the limit. */
  max_items?: number;
  /** Items needed once some item matches `item` (conditions read the item's fields). */
  min_items_when_any?: MinItemsWhenAny;
  /** When exactly one item matches `item`, it must not match `not` (an invalid list). */
  sole_item_not?: SoleItemNot;
  /** Child collection only: tab of the parent item modal that lists it (see `OverlayField.item_tab`). */
  item_tab?: string;
  /** Child collection only: sub-group of the parent item modal that lists it (see `OverlayField.item_group`). */
  item_group?: string;
}

interface Overlay {
  /** Sheet tabs the overlay maps; every typed row of them needs an entry once it has any. */
  tabs: readonly string[];
  /** Step the fields belong to; also the output file stem under `src/contracts/generated`. */
  name: StepSlug;
  entries: OverlayEntry[];
  /** Parent and item limits by collection key (the `collection` of the entries). */
  collections?: Readonly<Record<string, OverlayCollection>>;
}

export {
  ALWAYS,
  type CountryCell,
  type NormalizedType,
  type Overlay,
  type OverlayCatalog,
  type OverlayCollection,
  type OverlayEntry,
  type OverlayField,
  type OverlayFieldType,
  type OverlayIgnore,
  type OverlayRequired,
  snapshotSchema,
  type Snapshot,
  type SnapshotRow,
};
