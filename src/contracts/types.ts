import type { BlockOf, StepSlug } from '@/lib/constants/steps';
import type { CreateAccountRequestBody } from '@/server/api/account-requests';
import type {
  CountryCode,
  PersonType,
  RelatedPersonRole,
} from '@/types/domain';

type FieldType =
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

/** `request`: the people registered in the request itself, not a bank catalog (see `CatalogRef.roles`). */
type CatalogSource = 'api' | 'mdm' | 'core' | 'static' | 'unknown' | 'request';

type Value = string | number | boolean;

/**
 * Declarative visibility condition. Array values (multi catalogs) match when
 * they contain the expected value.
 */
type VisibilityExpr =
  | { always: true }
  | { field: string; eq: Value }
  | { field: string; in: readonly Value[] }
  | { field: string; neq: Value }
  | { field: string; gte: number }
  /** Catalog code, compared without case (`OTHER` and `other`). */
  | { field: string; code_eq: string }
  /** A chosen catalog code other than this one, compared without case. */
  | { field: string; code_neq: string }
  /** The field has a non-empty answer. */
  | { field: string; present: true }
  | { all: readonly VisibilityExpr[] }
  | { any: readonly VisibilityExpr[] };

type CountryVisibility = Partial<Record<CountryCode, VisibilityExpr>>;

type VisibleWhen = VisibilityExpr | CountryVisibility;

/** Base validation rule. Rule names double as validation message keys. */
type Rule =
  | { min: number }
  | { max: number }
  /** At least the value of another field (dates, amounts); `message_key` replaces the generic copy. */
  | { gte_field: string; message_key?: string }
  /** At most the value of another field; `message_key` replaces the generic copy. */
  | { lte_field: string; message_key?: string }
  /**
   * The sum of the `sum` fields, times `factor` (default 1), at most the sum of
   * the `limit` fields. Placed on each field of `sum`; checked once the field
   * and some `limit` field hold a number. Fields are looked up in the item,
   * then the section, then other sections (`context`).
   */
  | {
      sum_lte: {
        sum: readonly string[];
        limit: readonly string[];
        factor?: number;
      };
      message_key: string;
    }
  /**
   * Once the field and every applicable listed boolean field are answered, at
   * least one listed field must be "yes" (a missing answer, shown on this field).
   */
  | { any_true: readonly string[]; message_key: string }
  | { not_future: true }
  /** A date at most this many years ago (birth dates: 120). */
  | { max_years_ago: number }
  /** A country code the countries catalog does not flag `prohibited`. */
  | { not_prohibited: true }
  | { regex: string; message_key: string }
  /** Text that must NOT match `not_regex` (with `flags`, e.g. `iu`): a name written as a body or a class. */
  | { not_regex: string; flags?: string; message_key: string }
  /**
   * The shareholder's parent company (this field) must not be the person
   * itself or a company above it: that would close a cycle (POC
   * `cerrariaUnCiclo`). Reads the `shareholders` list in scope.
   */
  | { no_ownership_cycle: true; message_key: string }
  /** A yes/no confirmation that only "yes" satisfies; "no" shows `message_key`. */
  | { accepted: true; message_key: string }
  | { url: true }
  | { email: true };

/**
 * `true` means required whenever the field is visible. Countries missing from
 * the map default to required.
 */
type RequiredSpec = Partial<Record<CountryCode, boolean>> | 'when_visible';

/**
 * Field a dependent catalog is filtered by: one key, or one per country when
 * the levels differ (CR districts hang from the canton, DO municipalities from
 * the province).
 */
type CatalogParent = string | Partial<Record<CountryCode, string>>;

interface CatalogRef {
  name: string;
  parent?: CatalogParent;
  /** Hidden, and not required, while the chosen parent has no rows (POC: the DO sector). */
  hide_when_empty?: true;
  /**
   * Sibling field holding a country (residence). When it is one of the bank
   * countries the catalog is read for that country (`?country=`), otherwise for
   * the request's own (POC: a related party's domicile).
   */
  country_from?: string;
  source: CatalogSource;
  /** `source: 'request'`: lists the people holding any of these roles (`?role=`). */
  roles?: readonly RelatedPersonRole[];
  /** `source: 'request'`: only people of this type (`?person_type=`). */
  person_type?: PersonType;
  /** `source: 'request'`: error code when the chosen person is no longer listed (a broken link). */
  unlisted_key?: string;
}

/** A phone number in two parts, as the Onyx phone field emits it: dial code (`+505`) and national digits. */
interface PhoneValue {
  dial_code: string;
  number: string;
}

/** Profiling answers (captured on `/new`) a field can be seeded from when the request is created. */
type PreloadSource = keyof CreateAccountRequestBody;

/** Registry entry emitted by the contracts generator (data only). */
interface FieldDefinition {
  key: string;
  /** UI group (rail block) the field is rendered in; many blocks can share a section. */
  block: BlockOf<StepSlug>;
  type: FieldType;
  countries: readonly CountryCode[];
  required: RequiredSpec;
  catalog?: CatalogRef;
  visible_when?: VisibleWhen;
  validation?: readonly Rule[];
  max_length?: number;
  /** Free text answered in paragraphs: rendered as a full-width text area. */
  multiline?: true;
  /** Profiling answer the API seeds this field with when it creates the request. */
  preload_from?: PreloadSource;
  /** The server owns the value: controls render disabled and a changed value is rejected. */
  read_only?: boolean;
  ui_only?: boolean;
  /** Key of the embedded collection this field belongs to. */
  collection?: string;
  /** Collection whose items hold this field's collection (one nesting level; repeated on every item field). */
  parent_collection?: string;
  /**
   * Tab of the item modal the field shows in; on a child collection field, the
   * parent item tab that lists the child collection (child panels have no tabs).
   */
  item_tab?: string;
  /** Sub-group heading of the item modal the field sits under (POC `bloque`); child collections, as `item_tab`. */
  item_group?: string;
  /** Answered title fields, joined, name the item in the collection list. */
  item_title?: true;
  /** Has help copy under it (`<Step>Fields.hints.<key>` in the generated i18n file). */
  help?: true;
  /** Takes the whole row of the form grid (POC `ancho: 'completo'`). */
  full_width?: true;
  /**
   * Person datum the item field holds, named the same in every collection of
   * people (e.g. `identification_number`): records of different collections
   * are matched and prefilled through it. Defaults to the key.
   */
  person_field?: string;
  /**
   * Part of the identity of the person in the item (identification type and
   * number). Collections with identity fields warn about duplicates and
   * prefill people already registered in another collection.
   */
  identity?: true;
  /** Items the field's collection needs while visible (repeated on every item field). */
  min_items?: number;
  /** Items the field's collection allows (repeated on every item field). */
  max_items?: number;
  /** Items the field's collection needs once some item matches (repeated on every item field). */
  min_items_when_any?: MinItemsWhenAny;
  /** Rule on the lone item matching a condition (repeated on every item field). */
  sole_item_not?: SoleItemNot;
  /** Country-specific meaning of a shared key (e.g. lawyer role). */
  variant?: Partial<Record<CountryCode, string>>;
}

/**
 * A minimum of items that applies once some item matches `item` (POC: a joint
 * signature needs at least two signers). A missing answer, shown on the list
 * with `message_key`.
 */
interface MinItemsWhenAny {
  item: VisibilityExpr;
  min: number;
  message_key: string;
}

/**
 * When exactly one item matches `item`, that item must not also match `not`
 * (POC comite.ts `comiteEnBloque`: a lone committee record holding every
 * position is the body, not a member). An invalid list, shown with `message_key`.
 */
interface SoleItemNot {
  item: VisibilityExpr;
  not: VisibilityExpr;
  message_key: string;
}

/** Fields a block asks for in one country (conditions evaluated with no answers yet). */
interface BlockFieldCount {
  key: BlockOf<StepSlug>;
  fields: number;
}

export type {
  BlockFieldCount,
  CatalogParent,
  CatalogRef,
  CatalogSource,
  CountryVisibility,
  FieldDefinition,
  FieldType,
  MinItemsWhenAny,
  PhoneValue,
  PreloadSource,
  RequiredSpec,
  Rule,
  SoleItemNot,
  Value,
  VisibilityExpr,
  VisibleWhen,
};
