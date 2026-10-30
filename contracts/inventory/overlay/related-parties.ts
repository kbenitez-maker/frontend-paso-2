import { readFileSync } from 'node:fs';

import type { Rule, VisibilityExpr, VisibleWhen } from '@/contracts/types';
import type { BlockOf } from '@/lib/constants/steps';
import type { CountryCode } from '@/types/domain';
import type {
  Overlay,
  OverlayCollection,
  OverlayEntry,
  OverlayField,
  OverlayFieldType,
  SnapshotRow,
} from '../schema';

import {
  ADMINISTRATORS_REGISTERED,
  OWNERSHIP_WITHOUT_BENEFICIAL_OWNER,
  SHAREHOLDER_OWES_COMPLEMENTARY,
} from '@/lib/ownership';
import { HOLDER_LISTED, REGISTRATION_ROUTE } from '@/lib/related-parties';
import { COUNTRY_CODES } from '@/types/domain';

import { SNAPSHOT_PATH } from '../files';
import { snapshotSchema } from '../schema';

/*
 * The four tabs repeat one person questionnaire with small differences, so
 * each tab lists its rows in sheet order as shared specs. `partyEntries`
 * pairs them with the snapshot rows (labels are checked by the resolver), so
 * the duplicated labels ("Primer nombre" of the person, of the representative,
 * of the spouse) get their row hint from the sheet itself, information-group
 * headers are ignored, and country conditions keep only the countries the row
 * applies to.
 *
 * Tax residences, dependents and personal references are child collections
 * of the person (`collection` on the spec, prefixed like the keys): their
 * items are edited inside the person and their conditions may read the
 * person's answers.
 */

const SNAPSHOT = snapshotSchema.parse(
  JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')),
);

type Block = BlockOf<'related-parties'>;

/** Prefixes a spec name with the tab's key prefix (keys are unique across the step). */
type Key = (name: string) => string;
type Cond = (key: Key) => VisibilityExpr;
type When = Cond | Partial<Record<CountryCode, Cond>>;

interface Spec {
  label: string;
  name: string;
  type: OverlayFieldType;
  label_en: string;
  label_es?: string;
  catalog?: string;
  /** Catalog filter, as spec names (prefixed like the keys); see `OverlayCatalog`. */
  parent?: string | Partial<Record<CountryCode, string>>;
  /** Spec name of the sibling country the catalog follows (POC domicile rule). */
  country_from?: string;
  when?: When;
  /** Optional by nature (second names, TIN); otherwise required when visible. */
  optional?: true;
  validation?: Rule[];
  /** Child collection of the person (unprefixed name) the row belongs to. */
  collection?: string;
  /** POC position as a sheet row (see `OverlayField.sort_row`); the note says why. */
  sort_row?: number;
  note?: string;
}

interface Skip {
  label: string;
  reason: string;
}

type RowSpec = Spec | Skip;

/** Item modal tab and sub-group of a row (POC `pestana` and `bloque`); either may be absent. */
type Layout = readonly [tab: string | undefined, group: string | undefined];

interface Party {
  tab: string;
  prefix: string;
  section: string;
  block: Block;
  collection: string;
  rows: readonly RowSpec[];
  /**
   * Places a row (spec name; a child collection by its unprefixed name) in the
   * item modal, given its default sub-group: the sheet information group, or
   * the child collection name.
   */
  layout: (name: string, group: string | undefined) => Layout;
}

const MINORITY_ORDER_NOTE =
  'POC accionistas.ts asks the minority group right after the shareholder head (person type, company, percentage), before the identification; the sheet asks it after the company data.';

// --- Conditions (item-scoped: they read sibling fields of the same person) ---

const is =
  (name: string, value: string | boolean): Cond =>
  (key) => ({ field: key(name), eq: value });
const all =
  (...conds: Cond[]): Cond =>
  (key) => ({ all: conds.map((cond) => cond(key)) });
const any =
  (...conds: Cond[]): Cond =>
  (key) => ({ any: conds.map((cond) => cond(key)) });
/** `cond` in every country, with per-country exceptions. */
const everywhere = (
  cond: Cond,
  exceptions: Partial<Record<CountryCode, Cond>> = {},
): Partial<Record<CountryCode, Cond>> => ({
  ...Object.fromEntries(COUNTRY_CODES.map((country) => [country, cond])),
  ...exceptions,
});

const NATURAL = is('person_type_id', 'natural');
const LEGAL = is('person_type_id', 'legal');
const SIGNER = is('role_ids', 'signatory');
const LEGAL_REP = is('role_ids', 'legal-representative');
const NATURAL_SIGNER = all(NATURAL, SIGNER);
const NATURAL_SIGNER_OR_REP = all(NATURAL, any(SIGNER, LEGAL_REP));
const PEP = is('is_pep', true);
const PEP_HOLDER = is('pep_type_id', 'holder');
const PEP_FAMILY = is('pep_type_id', 'family');
const PEP_ASSOCIATE = is('pep_type_id', 'close-associate');
const MANAGES_PUBLIC_FUNDS = is('pep_manages_public_funds', true);
const LISTED = is('is_listed', true);
const OTHER_EXCHANGE = is('stock_exchange_id', 'other');
const FOREIGN_AGENT = is('is_foreign_agent', true);
const SALARIED = is('economic_activity_id', 'salaried');
const MARRIED_SIGNER = all(NATURAL_SIGNER, (key) => ({
  field: key('marital_status_id'),
  in: ['married', 'common-law'],
}));
const US_PERSON = all(
  NATURAL,
  any(
    is('nationality_id', 'US'),
    is('other_nationality_ids', 'US'),
    is('residence_country_id', 'US'),
  ),
);

/** Administrators' complementary data: NI, HN and SV ask it of signers and legal representatives only. */
const ADMIN_PROFILE = everywhere(NATURAL, {
  NI: NATURAL_SIGNER_OR_REP,
  HN: NATURAL_SIGNER_OR_REP,
  SV: NATURAL_SIGNER_OR_REP,
});
/** Economic profile: HN asks it of signers only. */
const SIGNER_PROFILE = everywhere(NATURAL_SIGNER_OR_REP, {
  HN: NATURAL_SIGNER,
});

const NOT_FUTURE: Rule[] = [{ not_future: true }];
/** POC relacionados/fechas.ts nacimientoValido: not in the future, nor more than 120 years ago. */
const BIRTH_DATE: Rule[] = [{ not_future: true }, { max_years_ago: 120 }];
/**
 * POC relacionados/fechas.ts identificacionValida: letters, digits, dots,
 * dashes and spaces only, with at least 5 letters or digits (no per-country
 * masks yet).
 */
const ID_NUMBER: Rule[] = [
  {
    regex: String.raw`^(?=(?:[^0-9A-Za-z]*[0-9A-Za-z]){5})[0-9A-Za-z.\-\s]+$`,
    message_key: 'identification_number',
  },
];
const MIN_ZERO: Rule[] = [{ min: 0 }];

const ROLE_NOTE =
  'Sheet: the options depend on the legal entity type ("Matriz de relacionados por país"). The bank catalog lists every role its matrix names (the POC narrows it to the request type: not modeled); the related-party-matrix endpoint says which roles and positions each section requires. Option codes are provisional.';
const PROFILE_NOTE =
  'HN also lists board members (or technical committee members) for some rows; not modeled.';
const SHAREHOLDER_LEVEL_NOTE =
  'Sheet asks it of first-level shareholders and of those whose computed total participation is >= 10%. POC accionistas.ts (43057bb9, debeDarComplementarios) asks the complementary data only after the participation calculation (structure confirmed), only of the people at or above the threshold (10% inclusive, lib/ownership.ts), and in their principal record (highest-level appearance): the computed `shareholder_owes_complementary` (src/lib/ownership.ts, evaluated by the zone). The POC seals the structure on confirmation (no adding or removing shareholders) although ITDFCJ-46 says "sin bloquear la edición": we follow the POC screen; PO decision pending.';
/** POC: complementary data only once the calculation marks this record (see SHAREHOLDER_LEVEL_NOTE). */
const OWES_COMPLEMENTARY: Cond = () => ({
  field: SHAREHOLDER_OWES_COMPLEMENTARY,
  eq: true,
});
const COMPLEMENTARY = all(OWES_COMPLEMENTARY, NATURAL);

// --- Shared specs ---

const text = (
  label: string,
  name: string,
  label_en: string,
  extra: Partial<Spec> = {},
): Spec => ({ label, name, type: 'string', label_en, ...extra });
/** Sheet types phones Entero; the POC asks them with a dial-code selector. */
const phone = (
  label: string,
  name: string,
  label_en: string,
  extra: Partial<Spec> = {},
): Spec => ({ label, name, type: 'phone', label_en, ...extra });
const catalog = (
  label: string,
  name: string,
  catalogName: string,
  label_en: string,
  extra: Partial<Spec> = {},
): Spec => ({
  label,
  name,
  type: 'catalog',
  catalog: catalogName,
  label_en,
  ...extra,
});
const yesNo = (
  label: string,
  name: string,
  label_en: string,
  extra: Partial<Spec> = {},
): Spec => ({ label, name, type: 'boolean', label_en, ...extra });
const date = (
  label: string,
  name: string,
  label_en: string,
  extra: Partial<Spec> = {},
): Spec => ({ label, name, type: 'date', label_en, ...extra });
const skip = (label: string, reason: string): Skip => ({ label, reason });

const PERSON_TYPE = catalog(
  'Tipo de persona',
  'person_type_id',
  'related-person-types',
  'Type of person',
  {
    note: 'Sheet: only natural persons when the related company applies final beneficiary (not modeled). Option codes are provisional (natural, legal).',
  },
);

const roles = (catalogName: string): Spec => ({
  label: 'Seleccione todos los roles que correspondan',
  name: 'role_ids',
  type: 'multi_catalog',
  catalog: catalogName,
  label_en: 'Select every role that applies',
  note: ROLE_NOTE,
});

const SIGNATURE_TYPE = catalog(
  'Tipo de firma',
  'signature_type_id',
  'signature-types',
  'Signature type',
  { when: SIGNER },
);

const naturalRows = (when: When): Spec[] => [
  text('Primer nombre', 'first_name', 'First name', { when }),
  text('Segundo nombre', 'middle_name', 'Middle name', {
    when,
    optional: true,
  }),
  text('Primer apellido', 'last_name', 'First surname', { when }),
  text('Segundo apellido', 'second_last_name', 'Second surname', {
    when,
    optional: true,
  }),
  catalog(
    'País de nacimiento',
    'birth_country_id',
    'countries',
    'Country of birth',
    { when },
  ),
  date('Fecha de nacimiento', 'birth_date', 'Date of birth', {
    when,
    validation: BIRTH_DATE,
  }),
];

const NATURAL_ID: Spec[] = [
  catalog(
    'Tipo de identificación',
    'identification_type_id',
    'identification-types',
    'Identification type',
    {
      when: NATURAL,
      note: 'Sheet: filter the catalog by type of person (not modeled).',
    },
  ),
  text(
    'Número de identificación',
    'identification_number',
    'Identification number',
    {
      when: NATURAL,
      validation: ID_NUMBER,
      note: 'Sheet: validate the 9-digit format for the Dominican ID card (not modeled; POC relacionados/fechas.ts checks only the characters and a minimum of 5).',
    },
  ),
];

/** Politically exposed person questions; the funds-origin label differs by tab. */
const pepRows = (fundsLabel: string): Spec[] => [
  yesNo(
    '¿El relacionado, o algún familiar o asociado, desempeña o desempeñó, un cargo público?',
    'is_pep',
    'Does the related party, or a relative or associate, hold or did they hold a public office?',
    { when: NATURAL },
  ),
  catalog('Tipo', 'pep_type_id', 'pep-relation-types', 'Who holds the office', {
    label_es: '¿Quién desempeña o desempeñó el cargo?',
    when: PEP,
    note: 'Option codes are provisional (holder, family, close-associate). BLHN shows holder and family only (not modeled).',
  }),
  catalog('Parentesco', 'pep_kinship_id', 'kinships', 'Relationship', {
    when: PEP_FAMILY,
  }),
  text(
    'Nombre de la persona relacionada',
    'pep_related_name',
    'Name of the related person',
    { when: everywhere(any(PEP_FAMILY, PEP_ASSOCIATE), { HN: PEP_FAMILY }) },
  ),
  text(
    'Cargo que ejerce / ejerció',
    'pep_position',
    'Office held now or in the past',
    { when: PEP },
  ),
  yesNo(
    '¿Actualmente ejerce este cargo?',
    'pep_current',
    'Do they currently hold this office?',
    { when: PEP },
  ),
  date('Fecha de inicio', 'pep_start_date', 'Start date', {
    when: PEP,
    validation: NOT_FUTURE,
  }),
  date('Fecha de finalización', 'pep_end_date', 'End date', {
    when: is('pep_current', false),
    validation: [...NOT_FUTURE, { gte_field: 'pep_start_date' }],
    note: 'Sheet and POC relacionados/fechas.ts: not before the start date (sibling field of the same person).',
  }),
  catalog(
    'País donde ejerce / ejerció',
    'pep_country_id',
    'countries',
    'Country where the office is or was held',
    { when: PEP },
  ),
  text(
    'Institución donde ejerce / ejerció',
    'pep_institution',
    'Institution where the office is or was held',
    {
      when: PEP,
      note: 'HN: only when the office is current or ended within 5 years (date difference, not modeled).',
    },
  ),
  {
    label: 'Ingresos anuales U$',
    name: 'pep_annual_income',
    type: 'decimal',
    label_es: 'Ingresos anuales (US$)',
    label_en: 'Annual income (US$)',
    when: PEP_HOLDER,
    validation: MIN_ZERO,
  },
  text(
    fundsLabel,
    'pep_funds_origin',
    'Source of funds (main source of income)',
    {
      label_es:
        'Descripción del origen de los fondos (principal fuente de ingresos)',
      when: PEP_HOLDER,
    },
  ),
  text('Nombre del cónyuge', 'pep_spouse_name', 'Spouse name', {
    when: PEP_HOLDER,
  }),
  text('Nombre de hijos(as)', 'pep_children_names', 'Names of children', {
    when: everywhere(PEP_HOLDER, { HN: PEP }),
    note: 'Multi-text in the sheet; free text. HN: also filtered by relationship (not modeled).',
  }),
  text('Nombre del padre', 'pep_father_name', 'Father name', { when: PEP }),
  text('Nombre de la madre', 'pep_mother_name', 'Mother name', { when: PEP }),
  text(
    'Nombre completo de abuelos (as)',
    'pep_grandparents_names',
    'Full names of grandparents',
    { label_es: 'Nombre completo de abuelos(as)', when: PEP },
  ),
  text('Nombre de hermanos(as)', 'pep_siblings_names', 'Names of siblings', {
    when: PEP,
  }),
  text(
    'Nombre de las esposas de hermanos(as)',
    'pep_siblings_spouses_names',
    'Names of the siblings’ spouses',
    { label_es: 'Nombre de los cónyuges de hermanos(as)', when: PEP },
  ),
  text(
    'Nombre del yerno(s) o nuera(s)',
    'pep_children_in_law_names',
    'Names of sons-in-law or daughters-in-law',
    { when: PEP },
  ),
  catalog(
    'Asociados',
    'pep_associate_type_id',
    'pep-associate-types',
    'Type of association',
    { label_es: 'Tipo de asociado', when: PEP_ASSOCIATE },
  ),
  text(
    'Explique el tipo de asociación',
    'pep_association_detail',
    'Explain the type of association',
    { when: is('pep_associate_type_id', 'other') },
  ),
  yesNo(
    '¿Maneja recursos públicos o del estado?',
    'pep_manages_public_funds',
    'Do they manage public or state resources?',
    { when: PEP },
  ),
  text(
    'Describa el tipo de recursos o bienes',
    'pep_public_funds_detail',
    'Describe the type of resources or assets',
    { when: MANAGES_PUBLIC_FUNDS },
  ),
  {
    label: 'Seleccione las entidades con las que tiene relación',
    name: 'pep_related_entity_ids',
    type: 'multi_catalog',
    catalog: 'public-entities',
    label_en: 'Select the entities they are related to',
    when: MANAGES_PUBLIC_FUNDS,
  },
];

const PUBLIC_FIGURE: Spec[] = [
  yesNo(
    '¿Es una persona notioriamente pública?',
    'is_public_figure',
    'Is this person a well-known public figure?',
    { label_es: '¿Es una persona notoriamente pública?', when: NATURAL },
  ),
  catalog(
    'Indique por que es una persona notoriamente pública',
    'public_figure_reason_id',
    'public-figure-reasons',
    'Why is this person a well-known public figure?',
    {
      label_es: 'Indique por qué es una persona notoriamente pública',
      when: is('is_public_figure', true),
    },
  ),
];

const LEGAL_ENTITY_TYPE = catalog(
  'Tipo de persona jurídica',
  'legal_entity_type_id',
  'legal-entity-types',
  'Legal entity type',
  { when: LEGAL },
);
const LEGAL_NAME = text(
  'Razón social de la empresa',
  'legal_name',
  'Company legal name',
  { when: LEGAL },
);
const TRADE_NAME = text('Nombre comercial', 'trade_name', 'Trade name', {
  when: LEGAL,
});
const COMPANY_ID: Spec[] = [
  catalog(
    'Tipo de identificación',
    'company_identification_type_id',
    'identification-types',
    'Company identification type',
    { when: LEGAL },
  ),
  text(
    'Número de identificación',
    'company_identification_number',
    'Company identification number',
    { when: LEGAL, validation: ID_NUMBER },
  ),
];
const INCORPORATION_COUNTRY = catalog(
  'País de constitución',
  'incorporation_country_id',
  'countries',
  'Country of incorporation',
  { when: LEGAL },
);
const companyCountry = (label: string): Spec =>
  catalog(
    label,
    'company_country_id',
    'countries',
    'Country where the company is located',
    {
      when: LEGAL,
    },
  );

const STOCK_EXCHANGE: Spec[] = [
  yesNo(
    '¿La empresa cotiza sus acciones en la bolsa de valores?',
    'is_listed',
    'Is the company listed on a stock exchange?',
    {
      when: LEGAL,
      note: 'NI, SV, DO: only when the legal entity type applies to shareholders in the related-parties matrix (not modeled).',
    },
  ),
  catalog(
    'Seleccione la bolsa de valores',
    'stock_exchange_id',
    'stock-exchanges',
    'Select the stock exchange',
    { when: LISTED },
  ),
  text(
    'Indicar el nombre de la bolsa de valores',
    'stock_exchange_name',
    'Name of the stock exchange',
    { when: OTHER_EXCHANGE },
  ),
  catalog(
    'Indicar el país de la bolsa de valores',
    'stock_exchange_country_id',
    'countries',
    'Country of the stock exchange',
    { when: OTHER_EXCHANGE },
  ),
  {
    label: 'URL del perfil de cotización en la bolsa de valores',
    name: 'stock_profile_url',
    type: 'url',
    label_en: 'URL of the listing profile on the stock exchange',
    when: LISTED,
  },
];

const REPRESENTATIVE: Spec[] = [
  text('Primer nombre', 'rep_first_name', 'Representative first name', {
    when: LEGAL,
  }),
  text('Segundo nombre', 'rep_middle_name', 'Representative middle name', {
    when: LEGAL,
    optional: true,
  }),
  text('Primer apellido', 'rep_last_name', 'Representative first surname', {
    when: LEGAL,
  }),
  text(
    'Segundo apellido',
    'rep_second_last_name',
    'Representative second surname',
    { when: LEGAL, optional: true },
  ),
  date(
    'Fecha de nacimiento',
    'rep_birth_date',
    'Representative date of birth',
    { when: LEGAL, validation: BIRTH_DATE },
  ),
  catalog(
    'País de nacimiento',
    'rep_birth_country_id',
    'countries',
    'Representative country of birth',
    { when: LEGAL },
  ),
  catalog(
    'Tipo de identificación',
    'rep_identification_type_id',
    'identification-types',
    'Representative identification type',
    { when: LEGAL },
  ),
  text(
    'Número de identificación',
    'rep_identification_number',
    'Representative identification number',
    { when: LEGAL, validation: ID_NUMBER },
  ),
];

/** Contact and nationality data; `when` is the tab's complementary-data condition. */
const contactRows = (when: When, note?: string): Spec[] => {
  const extra: Partial<Spec> = note === undefined ? { when } : { when, note };
  return [
    catalog('Género', 'gender_id', 'genders', 'Gender', extra),
    catalog(
      'Estado civil',
      'marital_status_id',
      'marital-statuses',
      'Marital status',
      extra,
    ),
    {
      label: 'Correo electrónico',
      name: 'email',
      type: 'email',
      label_en: 'Email',
      when,
      note: 'Sheet types it Texto; modeled as email.',
    },
    phone('Número de celular', 'mobile_phone', 'Mobile number', { when }),
    catalog(
      'País de residencia',
      'residence_country_id',
      'countries',
      'Country of residence',
      extra,
    ),
    catalog(
      'Nacionalidad',
      'nationality_id',
      'countries',
      'Nationality',
      extra,
    ),
    yesNo(
      '¿Posee otra(s) nacionalidad(es)?',
      'has_other_nationality',
      'Do they have other nationalities?',
      extra,
    ),
    {
      label: 'Seleccione el(os) país(es)',
      name: 'other_nationality_ids',
      type: 'multi_catalog',
      catalog: 'countries',
      label_es: 'Seleccione el o los países',
      label_en: 'Select the countries',
      when: is('has_other_nationality', true),
    },
  ];
};

const homeAddress = (when: When): Spec =>
  text(
    'Dirección detallada del domicilio',
    'home_address',
    'Detailed home address',
    { when },
  );

const DOMICILE_NOTE =
  'POC relacionados/catalogos.ts paisDelDomicilio: the options come from the country of residence when it is one of the six bank countries, otherwise from the request country (catalog.country_from); the POC does it for Departamento and Municipio only (Provincia, Cantón and Distrito stay on Costa Rica).';

const foreignAgentRows = (when: When): Spec[] => [
  yesNo(
    '¿Es Usted un Agente Extranjero de conformidad con la definición de Sujeto Obligado del Art.4. de la Ley 1040 , Ley de Regulación de Agentes Extranjeros?',
    'is_foreign_agent',
    'Are you a foreign agent under the definition of obligated subject in Art. 4 of Law 1040, Foreign Agents Regulation Law?',
    {
      label_es:
        '¿Es usted agente extranjero de conformidad con la definición de sujeto obligado del Art. 4 de la Ley 1040, Ley de Regulación de Agentes Extranjeros?',
      when,
    },
  ),
  {
    label: 'Número NURAE',
    name: 'nurae_number',
    type: 'integer',
    label_en: 'NURAE number',
    when: FOREIGN_AGENT,
    note: 'Sheet conditions it on the person and role only; modeled like the company NURAE (foreign agents).',
  },
  date('Fecha de emisión NURAE', 'nurae_issue_date', 'NURAE issue date', {
    when: FOREIGN_AGENT,
    validation: NOT_FUTURE,
  }),
  date('Fecha de vencimiento NURAE', 'nurae_expiry_date', 'NURAE expiry date', {
    when: FOREIGN_AGENT,
  }),
];

const TAX_RESIDENCES = 'tax_residences';

const taxResidenceRows = (when: When): Spec[] => [
  catalog(
    'País de residencia fiscal',
    'tax_residence_country_id',
    'countries',
    'Country of tax residence',
    { when, collection: TAX_RESIDENCES },
  ),
  text(
    'Número de identificación fiscal correspondiente (TIN)',
    'tin',
    'Corresponding tax identification number (TIN)',
    {
      when,
      optional: true,
      collection: TAX_RESIDENCES,
      note: 'Required for FATCA countries and when the country issues a TIN (not modeled): optional.',
    },
  ),
  text(
    'Dirección de residencia fiscal',
    'tax_residence_address',
    'Tax residence address',
    { when, collection: TAX_RESIDENCES },
  ),
];

const PERSONAL_REFERENCES = 'personal_references';
/** NI asks signers and legal representatives; HN, signers only. */
const REFERENCE_WHEN = { NI: NATURAL_SIGNER_OR_REP, HN: NATURAL_SIGNER };
const reference = (spec: Spec): Spec => ({
  when: REFERENCE_WHEN,
  collection: PERSONAL_REFERENCES,
  ...spec,
});
/** NI: workplace rows only when the reference currently works. */
const REFERENCE_WORKPLACE = {
  NI: all(NATURAL_SIGNER_OR_REP, is('reference_currently_works', true)),
  HN: NATURAL_SIGNER,
};

const PERSONAL_REFERENCE_ROWS: Spec[] = [
  reference(
    catalog(
      'Tipo de identificación',
      'reference_identification_type_id',
      'identification-types',
      'Identification type',
    ),
  ),
  reference(
    text(
      'Número de identificación',
      'reference_identification_number',
      'Identification number',
    ),
  ),
  reference(text('Nombre completo', 'reference_full_name', 'Full name')),
  reference(
    phone('Número de celular', 'reference_mobile_phone', 'Mobile number'),
  ),
  reference(
    phone(
      'Número de telefono del domicilio',
      'reference_home_phone',
      'Home phone number',
      { label_es: 'Número de teléfono del domicilio' },
    ),
  ),
  reference(
    text('Direccion detallada', 'reference_address', 'Detailed address', {
      label_es: 'Dirección detallada',
    }),
  ),
  reference(
    yesNo(
      'Actualmente Labora',
      'reference_currently_works',
      'Currently working?',
      { label_es: '¿Actualmente labora?' },
    ),
  ),
  reference(
    text(
      'Nombre del centro de trabajo',
      'reference_workplace_name',
      'Workplace name',
      { when: REFERENCE_WORKPLACE },
    ),
  ),
  reference(
    text(
      'Direccion del centro de trabajo',
      'reference_workplace_address',
      'Workplace address',
      {
        label_es: 'Dirección del centro de trabajo',
        when: REFERENCE_WORKPLACE,
      },
    ),
  ),
  reference(
    phone(
      'Número de teléfono del centro de trabajo',
      'reference_workplace_phone',
      'Workplace phone number',
      {
        when: REFERENCE_WORKPLACE,
        note: 'Sheet types it Texto; modeled as a phone like the other phone rows.',
      },
    ),
  ),
  reference(
    catalog(
      'Tiempo de conocer al referido',
      'reference_acquaintance_id',
      'acquaintance-durations',
      'How long they have known the reference',
      { label_es: 'Tiempo de conocer a la referencia' },
    ),
  ),
];

/** Complementary data of administrators (same rows in the trust administrators tab). */
const ADMIN_COMPLEMENTARY: RowSpec[] = [
  date(
    'Fecha de emisión de la identificación',
    'identification_issue_date',
    'Identification issue date',
    { when: ADMIN_PROFILE, validation: NOT_FUTURE },
  ),
  date(
    'Fecha de vencimiento de la identificación',
    'identification_expiry_date',
    'Identification expiry date',
    { when: ADMIN_PROFILE },
  ),
  catalog(
    'País de emisión de su identificación',
    'identification_country_id',
    'countries',
    'Country that issued the identification',
    { when: ADMIN_PROFILE },
  ),
  ...contactRows(ADMIN_PROFILE, PROFILE_NOTE),
  phone('Número de teléfono de domicilo', 'home_phone', 'Home phone number', {
    label_es: 'Número de teléfono del domicilio',
    when: ADMIN_PROFILE,
  }),
  catalog('Departamento', 'department_id', 'departments', 'Department', {
    when: ADMIN_PROFILE,
    country_from: 'residence_country_id',
    note: DOMICILE_NOTE,
  }),
  catalog('Municipio', 'municipality_id', 'municipalities', 'Municipality', {
    when: ADMIN_PROFILE,
    parent: 'department_id',
    country_from: 'residence_country_id',
    note: `Sheet: filtered by department. ${DOMICILE_NOTE}`,
  }),
  catalog('Provincia', 'province_id', 'provinces', 'Province', {
    when: ADMIN_PROFILE,
  }),
  catalog('cantón', 'canton_id', 'cantons', 'Canton', {
    label_es: 'Cantón',
    when: ADMIN_PROFILE,
    parent: 'province_id',
    note: 'Sheet: filtered by province.',
  }),
  catalog('Distrito', 'district_id', 'districts', 'District', {
    when: ADMIN_PROFILE,
    parent: { CR: 'canton_id', SV: 'municipality_id' },
    note: 'Sheet: filtered by canton (CR) or municipality (SV).',
  }),
  homeAddress(NATURAL_SIGNER_OR_REP),
  catalog(
    'Tipo poder del representante',
    'power_type_id',
    'representative-power-types',
    'Type of power of the representative',
    {
      label_es: 'Tipo de poder del representante',
      when: all(NATURAL, LEGAL_REP),
    },
  ),
  date(
    'Fecha de vencimiento del poder',
    'power_expiry_date',
    'Power of attorney expiry date',
    { when: all(NATURAL, LEGAL_REP) },
  ),
  ...foreignAgentRows(ADMIN_PROFILE),
  yesNo(
    '¿{{nombre_firmante}} Tiene personas que dependen económicamente de sus ingresos?',
    'has_dependents',
    'Do people depend financially on their income?',
    {
      label_es: '¿Tiene personas que dependen económicamente de sus ingresos?',
      when: SIGNER_PROFILE,
      note: 'The sheet puts the person name in a placeholder the form cannot fill; the copy drops it.',
    },
  ),
  {
    label: 'Cantidad de personas que tiene a su cargo',
    name: 'dependents_count',
    type: 'integer',
    label_en: 'Number of dependents',
    when: is('has_dependents', true),
    validation: MIN_ZERO,
  },
  text('Nombre completo', 'dependent_full_name', 'Full name', {
    when: is('has_dependents', true),
    collection: 'dependents',
    note: 'Sheet: the number of dependents should match dependents_count (not modeled).',
  }),
  catalog('Parentesco', 'dependent_kinship_id', 'kinships', 'Relationship', {
    when: is('has_dependents', true),
    collection: 'dependents',
  }),
  yesNo(
    '¿Tiene negocio propio?',
    'has_own_business',
    'Do they have their own business?',
    {
      when: ADMIN_PROFILE,
    },
  ),
  catalog(
    'Tipo de identificación del negocio',
    'business_identification_type_id',
    'identification-types',
    'Business identification type',
    { when: is('has_own_business', true) },
  ),
  text(
    'Número de identificación del negocio',
    'business_identification_number',
    'Business identification number',
    { when: is('has_own_business', true) },
  ),
  date(
    'Fecha de emisión de la identificación del negocio',
    'business_identification_issue_date',
    'Business identification issue date',
    { when: is('has_own_business', true), validation: NOT_FUTURE },
  ),
  date(
    'Fecha de vencimiento de la identificación del negocio',
    'business_identification_expiry_date',
    'Business identification expiry date',
    { when: is('has_own_business', true) },
  ),
  text(
    'Indique quien emitió la identificación del negocio',
    'business_identification_issuer',
    'Who issued the business identification?',
    {
      label_es: 'Indique quién emitió la identificación del negocio',
      when: is('has_own_business', true),
    },
  ),
  catalog(
    'Actividad economica',
    'economic_activity_id',
    'personal-economic-activities',
    'Economic activity',
    {
      label_es: 'Actividad económica',
      when: ADMIN_PROFILE,
      note: 'Option codes are provisional; "salaried" drives the NI work data.',
    },
  ),
  {
    label: 'Ingreso mensual',
    name: 'monthly_income',
    type: 'decimal',
    label_en: 'Monthly income',
    when: SIGNER_PROFILE,
    validation: MIN_ZERO,
  },
  catalog(
    'Moneda en que recibe los ingresos',
    'income_currency_id',
    'currencies',
    'Currency of the income',
    { when: SIGNER_PROFILE },
  ),
  yesNo(
    '¿Tiene otras fuentes de ingresos?',
    'has_other_income',
    'Do they have other sources of income?',
    { when: SIGNER_PROFILE },
  ),
  catalog(
    'Fuente de otros ingresos',
    'other_income_source_id',
    'income-sources',
    'Source of other income',
    { when: is('has_other_income', true) },
  ),
  {
    label: 'Monto mensual de otros ingresos',
    name: 'other_income_amount',
    type: 'decimal',
    label_en: 'Monthly amount of other income',
    when: is('has_other_income', true),
    validation: MIN_ZERO,
    note: 'BLHN: asked in lempiras only (currency not modeled).',
  },
  catalog('Profesión', 'profession_id', 'professions', 'Profession', {
    when: ADMIN_PROFILE,
  }),
  catalog('Ocupación', 'occupation_id', 'occupations', 'Occupation', {
    when: ADMIN_PROFILE,
  }),
  catalog(
    'Sector en el que labora actualmente',
    'work_sector_id',
    'work-sectors',
    'Sector they currently work in',
    { when: SIGNER_PROFILE },
  ),
  catalog(
    'Tipo de contratación',
    'employment_type_id',
    'employment-types',
    'Type of employment',
    { when: SIGNER_PROFILE },
  ),
  text(
    'Nombre del centro de trabajo',
    'employer_name',
    'Name of the workplace',
    {
      when: SIGNER_PROFILE,
      note: 'Sheet: preloaded with the company name (not modeled).',
    },
  ),
  text(
    'Dirección detallada de la empresa de trabajo',
    'employer_address',
    'Detailed address of the workplace',
    { when: { NI: SALARIED, HN: NATURAL_SIGNER } },
  ),
  phone('Número de teléfono del trabajo', 'work_phone', 'Work phone number', {
    when: { NI: SALARIED, HN: NATURAL_SIGNER },
  }),
  text(
    'Área o departamento en el que labora',
    'work_area',
    'Area or department they work in',
    { when: SIGNER_PROFILE },
  ),
  catalog(
    'Cargo o posición que desempeña',
    'job_position_id',
    'job-positions',
    'Position held',
    { when: SIGNER_PROFILE },
  ),
  {
    label: 'Tiempo de laborar (años)',
    name: 'years_employed',
    type: 'decimal',
    label_en: 'Time employed (years)',
    when: { NI: SALARIED, HN: NATURAL_SIGNER },
    validation: MIN_ZERO,
  },
  text(
    'Descripción de actividad económica del trabajo',
    'employer_activity',
    'Economic activity of the workplace',
    { when: { NI: SALARIED, HN: NATURAL_SIGNER } },
  ),
  {
    label: 'Correo electrónico del trabajo',
    name: 'work_email',
    type: 'email',
    label_en: 'Work email',
    when: SALARIED,
  },
  ...PERSONAL_REFERENCE_ROWS,
  text('Primer nombre', 'spouse_first_name', 'Spouse first name', {
    when: MARRIED_SIGNER,
  }),
  text('Segundo nombre', 'spouse_middle_name', 'Spouse middle name', {
    when: MARRIED_SIGNER,
    optional: true,
  }),
  text('Primer apellido', 'spouse_last_name', 'Spouse first surname', {
    when: MARRIED_SIGNER,
  }),
  text('Segundo apellido', 'spouse_second_last_name', 'Spouse second surname', {
    when: MARRIED_SIGNER,
    optional: true,
  }),
  phone('Número de celular', 'spouse_mobile_phone', 'Spouse mobile number', {
    when: MARRIED_SIGNER,
  }),
  {
    label: 'Correo electrónico',
    name: 'spouse_email',
    type: 'email',
    label_en: 'Spouse email',
    when: MARRIED_SIGNER,
  },
  yesNo(
    '¿El cónyuge labora actualmente?',
    'spouse_works',
    'Does the spouse currently work?',
    { when: MARRIED_SIGNER },
  ),
  catalog(
    'Profesión',
    'spouse_profession_id',
    'professions',
    'Spouse profession',
    {
      when: is('spouse_works', true),
    },
  ),
  text(
    'Nombre del centro de trabajo',
    'spouse_employer_name',
    'Spouse workplace name',
    { when: is('spouse_works', true) },
  ),
  phone(
    'Número de teléfono del centro de trabajo',
    'spouse_work_phone',
    'Spouse workplace phone number',
    { when: is('spouse_works', true) },
  ),
  text(
    'Direccion detallada del centro de trabajo',
    'spouse_employer_address',
    'Spouse workplace detailed address',
    {
      label_es: 'Dirección detallada del centro de trabajo',
      when: is('spouse_works', true),
    },
  ),
  yesNo(
    '¿El conyugue tiene hermanos(as)?',
    'spouse_has_siblings',
    'Does the spouse have siblings?',
    { label_es: '¿El cónyuge tiene hermanos(as)?', when: MARRIED_SIGNER },
  ),
  text(
    'Nombre completo de los padres',
    'spouse_parents_names',
    'Full names of the spouse’s parents',
    {
      label_es: 'Nombre completo de los padres del cónyuge',
      when: MARRIED_SIGNER,
    },
  ),
  text(
    'Nombre completos de los hermanos(as)',
    'spouse_siblings_names',
    'Full names of the spouse’s siblings',
    {
      label_es: 'Nombres completos de los hermanos(as) del cónyuge',
      when: is('spouse_has_siblings', true),
    },
  ),
  text(
    'Nombre completo del esposo(a) de hermanos(as)',
    'spouse_siblings_spouses_names',
    'Full names of the spouses of the spouse’s siblings',
    {
      label_es:
        'Nombre completo de los cónyuges de los hermanos(as) del cónyuge',
      when: is('spouse_has_siblings', true),
    },
  ),
  ...taxResidenceRows(NATURAL),
];

/** Rows of the person tab after its role questions, shared by both administrator tabs. */
const administratorBody = (fundsLabel: string): RowSpec[] => [
  ...naturalRows(NATURAL),
  ...NATURAL_ID,
  ...pepRows(fundsLabel),
  ...PUBLIC_FIGURE,
  LEGAL_ENTITY_TYPE,
  LEGAL_NAME,
  TRADE_NAME,
  ...COMPANY_ID,
  INCORPORATION_COUNTRY,
  companyCountry('País de ubicación de la empresa'),
  ...STOCK_EXCHANGE,
  ...REPRESENTATIVE,
  ...ADMIN_COMPLEMENTARY,
];

const FUNDS_OF =
  'Descripción de los origen de fondos (principal fuente de ingresos)';

// --- Item modal layout (POC: campos-relacionado.ts, accionistas.ts, fideicomiso.ts) ---

/** POC sub-group (`bloque`) of each sheet information group; parent headers have none. */
const GROUPS: Readonly<Partial<Record<string, string>>> = {
  'Datos generales': 'general',
  'Datos personales': 'personal',
  'Datos de persona expuesta politicamente': 'pep',
  'Datos persona notoriamente pública': 'public_figure',
  'Datos generales de la empresa': 'company',
  'Datos bolsa de valores': 'stock_exchange',
  'Datos del representante': 'representative',
  'Datos complementarios persona natural': 'natural_complementary',
  'Información negocio propio': 'own_business',
  'Perfil económico': 'economic_profile',
  'Información laboral': 'employment',
  'Información del cónyugue': 'spouse',
  'Datos laborales del cónyugue': 'spouse_employment',
  'Datos adicionales del cónyugue': 'spouse_additional',
  'Autocertificacion de residencia fiscal': 'tax_self_certification',
};
/** Groups of the POC "Datos básicos" tab. */
const BASIC_GROUPS = new Set([
  'general',
  'personal',
  'pep',
  'public_figure',
  'company',
  'stock_exchange',
]);
/** POC list title (`rotular`): first name and surname, else the legal name. */
const TITLE_NAMES = new Set(['first_name', 'last_name', 'legal_name']);
/**
 * POC moves part of the sheet's "Datos complementarios persona natural" of
 * administrators to its own tab (the rest, with identification dates, address
 * by department and the foreign agent rows, stays in "Rol administrativo").
 */
const ADMIN_COMPLEMENTARY_NAMES = new Set([
  'gender_id',
  'marital_status_id',
  'email',
  'mobile_phone',
  'residence_country_id',
  'nationality_id',
  'has_other_nationality',
  'other_nationality_ids',
  'province_id',
  'canton_id',
  'home_address',
]);
/** POC asks these first and outside any sub-group. */
const SHAREHOLDER_HEAD = new Set([
  'person_type_id',
  'parent_company_id',
  'share_percentage',
]);
/**
 * POC groups the minority questions under "Socios y accionistas"; the sheet
 * lists them with the company. Groups follow the registry (sheet) order, so the
 * heading comes after the company data (POC: right after "Datos generales").
 */
const SHAREHOLDER_MINORITY = new Set([
  'has_minority_shareholders',
  'minority_shareholder_count',
  'minority_share_percentage',
]);

const shareholders: Party = {
  tab: 'Accionistas',
  prefix: 'shareholder',
  section: 'shareholders',
  block: 'shareholders',
  collection: 'shareholders',
  // POC: one modal without tabs (accionistas.ts `enUnSoloModal`), sub-groups only.
  layout: (name, group) => [
    undefined,
    SHAREHOLDER_HEAD.has(name) ? undefined
    : SHAREHOLDER_MINORITY.has(name) ? 'minority_shareholders'
    : group,
  ],
  rows: [
    PERSON_TYPE,
    catalog(
      'Seleccione la empresa a la cual está relacionada',
      'parent_company_id',
      'shareholding-companies',
      'Select the company this shareholder belongs to',
      {
        validation: [
          { no_ownership_cycle: true, message_key: 'ownership_cycle' },
        ],
        note: 'Sheet: list the legal persons of the structure (the holder included) whose shares do not add up to 100%, and default to the holder for the first shareholder. POC accionistas.ts (43057bb9, jerarquia, empresasConCapitalDisponible, rotuloDeEmpresa): the zone builds the options from the shareholders list ("Nivel n · X · queda y %"), hides the companies already at 100% (POC screen; the current value stays listed so an edit keeps it), and adding from a company of the tree presets and locks it. Value: `holder`, or the identification (`<type>|<number>`, lowercase) of the shareholder company (src/lib/ownership.ts); the bank catalog is not read. POC `cerrariaUnCiclo` (CA 14): a company where the same person already holds shares further up the branch is refused at capture (`no_ownership_cycle`).',
      },
    ),
    {
      label: 'Porcentaje de acciones',
      name: 'share_percentage',
      type: 'decimal',
      label_en: 'Percentage of shares',
      validation: [{ min: 0.01 }, { max: 100 }],
      note: 'Sheet: applies per the related-parties matrix (not modeled); cannot be 0, above 100 or below 0. Each company of the chain must add up to 100% (cross-item rule, not modeled).',
    },
    catalog(
      'Tipo de identificación',
      'identification_type_id',
      'identification-types',
      'Identification type',
      {
        note: 'Sheet: used to look up the person in the administrators and shareholders already registered and preload their data (not modeled).',
      },
    ),
    text(
      'Número de identificación',
      'identification_number',
      'Identification number',
      { validation: ID_NUMBER },
    ),
    ...naturalRows(NATURAL),
    skip(
      'Tipo de identificación',
      'Duplicate of the identification type asked for every shareholder (sheet row 8).',
    ),
    skip(
      'Número de identificación',
      'Duplicate of the identification number asked for every shareholder (sheet row 9).',
    ),
    date(
      'Fecha de vencimiento de identificación',
      'identification_expiry_date',
      'Identification expiry date',
      {
        label_es: 'Fecha de vencimiento de la identificación',
        when: NATURAL,
      },
    ),
    ...pepRows(FUNDS_OF),
    ...PUBLIC_FIGURE,
    LEGAL_ENTITY_TYPE,
    yesNo(
      '¿Tiene socios o accionistas con menos del 10% de participación?',
      'has_minority_shareholders',
      'Does it have partners or shareholders with less than 10% participation?',
      {
        when: LEGAL,
        sort_row: 7.1,
        note: `${MINORITY_ORDER_NOTE} Sheet: only for corporations with the shareholder role and >= 10% participation (not modeled).`,
      },
    ),
    {
      label:
        'Indique cuántos accionistas tienen menos del 10% de participación',
      name: 'minority_shareholder_count',
      type: 'integer',
      label_en: 'How many shareholders have less than 10% participation?',
      when: is('has_minority_shareholders', true),
      validation: [{ min: 1 }],
      sort_row: 7.2,
      note: MINORITY_ORDER_NOTE,
    },
    {
      label: 'Indique el porcentaje total de acciones',
      name: 'minority_share_percentage',
      type: 'decimal',
      label_en: 'Total percentage of their shares',
      when: is('has_minority_shareholders', true),
      validation: [{ min: 0 }, { max: 100 }],
      sort_row: 7.3,
      note: `${MINORITY_ORDER_NOTE} Sheet conditions it on the count "== Sí" (typo); shown with the minority question. Sum of the shares of the shareholders below 10%.`,
    },
    LEGAL_NAME,
    TRADE_NAME,
    skip(
      'Tipo de identificación',
      'Duplicate of the identification type asked for every shareholder (sheet row 8).',
    ),
    skip(
      'Número de identificación',
      'Duplicate of the identification number asked for every shareholder (sheet row 9).',
    ),
    INCORPORATION_COUNTRY,
    companyCountry('País de domicilio de la empresa'),
    ...STOCK_EXCHANGE,
    ...contactRows(COMPLEMENTARY, SHAREHOLDER_LEVEL_NOTE),
    homeAddress(COMPLEMENTARY),
    text(
      'Número de Seguridad Social (SSN)',
      'ssn',
      'Social Security Number (SSN)',
      {
        when: all(OWES_COMPLEMENTARY, US_PERSON),
        note: `US person read from nationality, other nationalities or residence (code US). ${SHAREHOLDER_LEVEL_NOTE} (Sheet: PA threshold 25%; the POC applies 10% everywhere.) Sheet types it Entero; modeled as string.`,
      },
    ),
    ...taxResidenceRows(COMPLEMENTARY),
  ],
};

const administrators: Party = {
  tab: 'Administradores',
  prefix: 'admin',
  section: 'administrators',
  block: 'administrators',
  collection: 'administrators',
  layout: (name, group) => [
    group !== undefined && BASIC_GROUPS.has(group) ? 'basic'
    : group === TAX_RESIDENCES || ADMIN_COMPLEMENTARY_NAMES.has(name) ?
      'complementary'
    : 'administrative',
    group,
  ],
  rows: [
    PERSON_TYPE,
    roles('related-party-roles'),
    {
      label: 'Cargo de la junta directiva / Seleccione el cargo',
      name: 'board_position_ids',
      type: 'multi_catalog',
      catalog: 'board-positions',
      label_es: 'Cargo en la junta directiva',
      label_en: 'Position on the board of directors',
      when: is('role_ids', 'board-member'),
    },
    yesNo(
      '¿Este Relacionado tiene algún rol administrativo dentro de la empresa?',
      'has_admin_position',
      'Does this related party have an administrative role in the company?',
      {
        label_es:
          '¿Este relacionado tiene algún rol administrativo dentro de la empresa?',
        when: { NI: NATURAL_SIGNER_OR_REP, CR: NATURAL },
      },
    ),
    {
      label: 'Cargo administrativo',
      name: 'admin_position_ids',
      type: 'multi_catalog',
      catalog: 'administrative-positions',
      label_en: 'Administrative position',
      when: is('has_admin_position', true),
      note: 'Sheet: shown for foreign legal entity types, otherwise preloaded with "Gerente general" (not modeled).',
    },
    SIGNATURE_TYPE,
    yesNo('¿Posee otro rol?', 'has_other_role', 'Do they have another role?'),
    text(
      'Especifique el rol / cargo',
      'other_role',
      'Specify the role or position',
      { when: is('has_other_role', true) },
    ),
    ...administratorBody(
      'Descripción del origen de fondos (principal fuente de ingresos)',
    ),
  ],
};

/** Adds `rule` to the rows named in `names` (POC `validar` on a few fields of a tab). */
const withRule = (
  rows: readonly RowSpec[],
  names: readonly string[],
  rule: Rule,
): RowSpec[] =>
  rows.map((row) =>
    'reason' in row || !names.includes(row.name) ?
      row
    : { ...row, validation: [...(row.validation ?? []), rule] },
  );

/**
 * POC comite.ts avisoDeOrganoColectivo (ITDFCJ-49 CA 3): a name that starts
 * with the noun of a body (after an optional article) names the body, not a
 * member. Followed by the end, a space or punctuation (`\b` misses accented letters).
 */
const BODY_NAME: Rule = {
  not_regex:
    '^\\s*(?:(?:el|la|los|las)\\s+)?(?:comité|comite|junta|consejo|patronato|directorio|asamblea|órgano|organo)(?=$|[\\s.,;:·-])',
  flags: 'iu',
  message_key: 'body_name',
};

/**
 * POC fideicomiso.ts FORMULAS_DE_CLASE (ITDFCJ-50 CA 3 and 8): explicit
 * collective formulas ("los hijos…", "herederos legales") describe a class,
 * not a person. Conservative on purpose: proper names never match.
 */
const CLASS_NAME: Rule = {
  not_regex: [
    '\\blos\\s+(?:hijos|nietos|herederos|descendientes|familiares|empleados|trabajadores|socios|miembros|beneficiarios|colaboradores)\\b',
    '\\blas\\s+(?:hijas|nietas|herederas|descendientes|empleadas|trabajadoras|socias)\\b',
    '\\b(?:herederos|descendientes)\\s+(?:legales|leg[ií]timos|forzosos)\\b',
    '\\bquienes\\s+(?:resulten|sean|fueren)\\b',
    '\\b(?:el|los)\\s+personal\\b',
    '\\ba\\s+quien\\s+corresponda\\b',
  ].join('|'),
  flags: 'iu',
  message_key: 'party_as_class',
};

/** POC fideicomiso.ts soloPersonasNaturales (ITDFCJ-49): HN and CR register natural persons only. */
const TRUST_ADMIN_PERSON_TYPE: Spec = {
  ...PERSON_TYPE,
  catalog: 'trust-administrator-person-types',
  note: 'POC fideicomiso.ts (ITDFCJ-49): HN and CR trust administrators are natural persons only; the bank catalog offers only Natural there (the legal-person rows already exclude HN and CR). Option codes are provisional (natural, legal).',
};

// POC fideicomiso.ts sinConfirmarVigencia (ITDFCJ-48 CA 6, shared by route C) is inert here:
// the trust administration has no appointment validity field, so no expired-appointment check.
const trustAdministrators: Party = {
  tab: 'Administradores FIDEICOMISOS',
  prefix: 'trust_admin',
  section: 'trust-administrators',
  block: 'trust-administrators',
  collection: 'trust_administrators',
  // POC: no "Información complementaria" tab, and the signature type sits in "Rol administrativo".
  layout: (name, group) => [
    (
      group !== undefined &&
      BASIC_GROUPS.has(group) &&
      name !== SIGNATURE_TYPE.name
    ) ?
      'basic'
    : 'administrative',
    group,
  ],
  rows: [
    TRUST_ADMIN_PERSON_TYPE,
    roles('trust-administration-roles'),
    {
      label: 'Comité Técnico / Seleccione el cargo',
      name: 'committee_position_ids',
      type: 'multi_catalog',
      catalog: 'technical-committee-positions',
      label_es: 'Cargo en el comité técnico',
      label_en: 'Position on the technical committee',
      when: is('role_ids', 'technical-committee'),
    },
    SIGNATURE_TYPE,
    // POC conAvisoDeOrgano: the member's first name or legal name is not the body's.
    ...withRule(
      administratorBody(FUNDS_OF),
      ['first_name', 'legal_name'],
      BODY_NAME,
    ),
  ],
};

const trustParties: Party = {
  tab: 'Partes del FIDEICOMISO',
  prefix: 'trust_party',
  section: 'trust-parties',
  block: 'trust-parties',
  collection: 'trust_parties',
  // POC: a single "Datos básicos" tab.
  layout: (_name, group) => ['basic', group],
  // POC conAvisoDeClase: the names where the party is written are not a class.
  rows: withRule(
    [
      PERSON_TYPE,
      roles('trust-party-roles'),
      ...naturalRows(NATURAL),
      ...NATURAL_ID,
      ...pepRows(FUNDS_OF),
      ...contactRows(NATURAL),
      homeAddress(NATURAL),
      ...foreignAgentRows(NATURAL),
      ...taxResidenceRows(NATURAL),
      ...PUBLIC_FIGURE,
      LEGAL_ENTITY_TYPE,
      LEGAL_NAME,
      TRADE_NAME,
      ...COMPANY_ID,
      INCORPORATION_COUNTRY,
      companyCountry('País de ubicación de la empresa'),
      ...STOCK_EXCHANGE,
      ...REPRESENTATIVE,
    ],
    ['first_name', 'legal_name', 'trade_name'],
    CLASS_NAME,
  ),
};

// --- Pairing with the sheet ---

const isMarker = (row: SnapshotRow): boolean =>
  /\[(?:inicio|fin)\]$/i.test(row.label);

const appliesIn = (row: SnapshotRow | undefined): Set<CountryCode> =>
  new Set(
    COUNTRY_CODES.filter(
      (country) => row?.countries[country]?.applies === true,
    ),
  );

const visibility = (
  when: When | undefined,
  key: Key,
  countries: Set<CountryCode>,
): VisibleWhen | undefined => {
  if (when === undefined) return undefined;
  if (typeof when === 'function') return when(key);
  const map = Object.fromEntries(
    COUNTRY_CODES.flatMap((country) => {
      const cond = when[country];
      return cond !== undefined && countries.has(country) ?
          [[country, cond(key)]]
        : [];
    }),
  );
  return Object.keys(map).length > 0 ? map : undefined;
};

/** Item sub-groups that hold data of the person itself (not of its role in this list). */
const PERSON_GROUPS = new Set([
  'personal',
  'pep',
  'public_figure',
  'company',
  'stock_exchange',
  'natural_complementary',
]);
/** Identification of the person: duplicates are warned and known people prefilled through it. */
const IDENTITY_NAMES = new Set([
  'identification_type_id',
  'identification_number',
]);

/** Whether a person field holds data of the person, shared by name across the lists of people. */
const isPersonField = (name: string, group: string | undefined): boolean =>
  name === 'person_type_id' ||
  IDENTITY_NAMES.has(name) ||
  (group !== undefined && PERSON_GROUPS.has(group));

const prefixed = (
  parent: NonNullable<Spec['parent']>,
  key: Key,
): string | Partial<Record<CountryCode, string>> =>
  typeof parent === 'string' ?
    key(parent)
  : Object.fromEntries(
      Object.entries(parent).map(([country, name]) => [country, key(name)]),
    );

const partyEntries = ({
  tab,
  prefix,
  section,
  block,
  collection,
  rows,
  layout,
}: Party): OverlayEntry[] => {
  const key: Key = (name) => `${prefix}_${name}`;
  const sheet = SNAPSHOT.rows.filter(
    (row) => row.tab === tab && !isMarker(row),
  );
  const entries: OverlayEntry[] = [];
  let cursor = 0;
  let group: string | undefined;
  const skipGroups = () => {
    for (
      let row = sheet[cursor];
      row?.normalized_type === 'group';
      row = sheet[cursor]
    ) {
      group = GROUPS[row.label];
      entries.push({
        tab,
        label: row.label,
        row: row.row,
        ignore: true,
        reason: 'Information group header; the form shows the fields only.',
      });
      cursor += 1;
    }
  };

  for (const spec of rows) {
    skipGroups();
    const row = sheet[cursor];
    cursor += 1;
    const at = row === undefined ? {} : { row: row.row };
    if ('reason' in spec) {
      entries.push({
        tab,
        label: spec.label,
        ...at,
        ignore: true,
        reason: spec.reason,
      });
      continue;
    }
    const countries = appliesIn(row);
    const visibleWhen = visibility(spec.when, key, countries);
    // Child collection rows take their place from the collections map.
    const [itemTab, itemGroup] =
      spec.collection === undefined ?
        layout(spec.name, group)
      : [undefined, undefined];
    entries.push({
      tab,
      label: spec.label,
      ...at,
      ...(spec.label_es !== undefined && { label_es: spec.label_es }),
      label_en: spec.label_en,
      key: key(spec.name),
      section,
      block,
      collection:
        spec.collection === undefined ? collection : key(spec.collection),
      type: spec.type,
      required:
        spec.optional ?
          Object.fromEntries([...countries].map((country) => [country, false]))
        : 'when_visible',
      ...(spec.catalog !== undefined && {
        catalog: {
          name: spec.catalog,
          ...(spec.parent !== undefined && {
            parent: prefixed(spec.parent, key),
          }),
          ...(spec.country_from !== undefined && {
            country_from: key(spec.country_from),
          }),
          source: 'unknown' as const,
        },
      }),
      ...(visibleWhen !== undefined && { visible_when: visibleWhen }),
      ...(spec.validation !== undefined && {
        validation: spec.validation.map((rule) =>
          'gte_field' in rule ? { gte_field: key(rule.gte_field) } : rule,
        ),
      }),
      ...(spec.sort_row !== undefined && { sort_row: spec.sort_row }),
      ...(spec.note !== undefined && { note: spec.note }),
      ...(itemTab !== undefined && { item_tab: itemTab }),
      ...(itemGroup !== undefined && { item_group: itemGroup }),
      ...(spec.collection === undefined &&
        TITLE_NAMES.has(spec.name) && { item_title: true as const }),
      ...(spec.collection === undefined &&
        isPersonField(spec.name, itemGroup) && { person_field: spec.name }),
      ...(spec.collection === undefined &&
        IDENTITY_NAMES.has(spec.name) && { identity: true as const }),
    });
  }
  skipGroups();
  return entries;
};

const TABS = [shareholders, administrators, trustAdministrators, trustParties];

/** Child collections of a tab's person, keyed like its fields. */
const childCollections = (party: Party): [string, OverlayCollection][] =>
  [
    ...new Set(
      party.rows.flatMap((row) =>
        'reason' in row ? [] : (row.collection ?? []),
      ),
    ),
  ].map((child) => {
    const [itemTab, itemGroup] = party.layout(child, child);
    return [
      `${party.prefix}_${child}`,
      {
        parent: party.collection,
        ...(child === PERSONAL_REFERENCES && { min_items: 2 }),
        ...(itemTab !== undefined && { item_tab: itemTab }),
        ...(itemGroup !== undefined && { item_group: itemGroup }),
      },
    ];
  });

// --- POC fields the sheet lacks (routing blocks, socios-relacionados.ts, ruta-b.ts, fideicomiso.ts) ---

const ALL_COUNTRIES = COUNTRY_CODES;
const ROUTE_A = { field: REGISTRATION_ROUTE, eq: 'A' } as const;
const HOLDER_LISTED_A = {
  all: [{ field: HOLDER_LISTED, eq: true }, ROUTE_A],
} as const;
const HOLDER_OTHER_EXCHANGE = {
  all: [HOLDER_LISTED_A, { field: 'holder_stock_exchange_id', eq: 'other' }],
} as const;
const OPTIONAL = Object.fromEntries(
  ALL_COUNTRIES.map((country) => [country, false]),
);

const LISTING_NOTE =
  'POC socios-relacionados.ts COTIZACION (ITDFCJ-44 CA 2): the holder listing question opens the step on route A (and carries the unmapped-type notice); the sheet only asks it in Actividad Económica (economic-activity lists_on_stock_exchange), a separate answer in the POC too. The exchange details are route A only.';
const TRUST_CLOSING_NOTE =
  'POC fideicomiso.ts CIERRE_FIDEICOMISO (ITDFCJ-50 CA 8): confirmations of the trust contract and its term, not in the sheet.';

const pocField = (
  field: Omit<OverlayField, 'poc_only' | 'countries' | 'tab'> & {
    tab?: string;
  },
): OverlayField => ({
  tab: 'Administradores',
  poc_only: true,
  countries: ALL_COUNTRIES,
  ...field,
});

const holderListing: OverlayField[] = [
  pocField({
    label: '¿La empresa titular cotiza sus acciones en la bolsa de valores?',
    label_en: 'Does the holder company list its shares on a stock exchange?',
    key: HOLDER_LISTED,
    section: 'holder-listing',
    block: 'holder-listing',
    type: 'boolean',
    required: 'when_visible',
    sort_row: 0.1,
    note: LISTING_NOTE,
  }),
  pocField({
    label: 'Seleccione la bolsa de valores',
    label_en: 'Select the stock exchange',
    key: 'holder_stock_exchange_id',
    section: 'holder-listing',
    block: 'holder-listing',
    type: 'catalog',
    catalog: { name: 'stock-exchanges', source: 'unknown' },
    required: 'when_visible',
    visible_when: HOLDER_LISTED_A,
    sort_row: 0.2,
    note: LISTING_NOTE,
  }),
  pocField({
    label: 'Indicar el nombre de la bolsa de valores',
    label_en: 'Name of the stock exchange',
    key: 'holder_stock_exchange_name',
    section: 'holder-listing',
    block: 'holder-listing',
    type: 'string',
    required: OPTIONAL,
    visible_when: HOLDER_OTHER_EXCHANGE,
    sort_row: 0.3,
    note: LISTING_NOTE,
  }),
  pocField({
    label: 'Indicar el país de la bolsa de valores',
    label_en: 'Country of the stock exchange',
    key: 'holder_stock_exchange_country_id',
    section: 'holder-listing',
    block: 'holder-listing',
    type: 'catalog',
    catalog: { name: 'countries', source: 'unknown' },
    required: OPTIONAL,
    visible_when: HOLDER_OTHER_EXCHANGE,
    sort_row: 0.4,
    note: LISTING_NOTE,
  }),
  pocField({
    label: 'URL del perfil de cotización en la bolsa de valores',
    label_en: 'URL of the listing profile on the stock exchange',
    key: 'holder_stock_profile_url',
    section: 'holder-listing',
    block: 'holder-listing',
    type: 'url',
    required: 'when_visible',
    visible_when: HOLDER_LISTED_A,
    validation: [{ regex: '^https://', message_key: 'url' }],
    full_width: true,
    sort_row: 0.5,
    note: `${LISTING_NOTE} POC: must start with https.`,
  }),
];

/** POC ruta-b.ts revisoLosPoderesOtorgados (ITDFCJ-48 CA 3): route B closes its governing body with this confirmation. */
const powersReviewed = pocField({
  label:
    'Confirmo que revisé los poderes otorgados por la entidad y que registré a todos los apoderados y firmantes que existen.',
  label_en:
    'I confirm that I reviewed the powers granted by the entity and registered every attorney-in-fact and signatory there is.',
  key: 'powers_reviewed',
  section: 'administrators',
  block: 'administrators',
  type: 'boolean',
  required: 'when_visible',
  visible_when: { field: REGISTRATION_ROUTE, eq: 'B' },
  validation: [{ accepted: true, message_key: 'powers_not_reviewed' }],
  sort_row: 10_000,
  note: 'POC ruta-b.ts (ITDFCJ-48 CA 3): route B only, after the people; answering No blocks the section. The POC appointment validity fields (CA 6) have no sheet row and are not modeled.',
});

const trustClosing: OverlayField[] = [
  pocField({
    label:
      'Confirmo que el titular de la cuenta es el fideicomiso y no la sociedad fiduciaria a nombre propio.',
    label_en:
      'I confirm that the account holder is the trust and not the trust company in its own name.',
    key: 'trust_is_account_holder',
    section: 'trust-closing',
    block: 'trust-closing',
    type: 'boolean',
    required: 'when_visible',
    validation: [{ accepted: true, message_key: 'trust_holder_mismatch' }],
    sort_row: 10_001,
    note: TRUST_CLOSING_NOTE,
  }),
  pocField({
    label:
      'Confirmo que el contrato identifica a todos sus beneficiarios y que ninguno queda descrito solo como clase.',
    label_en:
      'I confirm that the contract identifies every beneficiary and none is described only as a class.',
    key: 'beneficiaries_identified',
    section: 'trust-closing',
    block: 'trust-closing',
    type: 'boolean',
    required: 'when_visible',
    validation: [{ accepted: true, message_key: 'beneficiaries_as_class' }],
    help: {
      es: 'Un beneficiario descrito como clase («los hijos del fideicomitente», «los empleados de la empresa») no permite identificar a nadie.',
      en: 'A beneficiary described as a class ("the settlor\'s children", "the company\'s employees") does not identify anyone.',
    },
    sort_row: 10_002,
    note: TRUST_CLOSING_NOTE,
  }),
  pocField({
    label:
      'Confirmo que revisé si el contrato prevé apoderado, protector, supervisor o comité técnico, y que sus integrantes quedaron registrados con su cargo.',
    label_en:
      'I confirm that I checked whether the contract provides for an attorney-in-fact, protector, supervisor or technical committee, and that their members are registered with their position.',
    key: 'optional_figures_reviewed',
    section: 'trust-closing',
    block: 'trust-closing',
    type: 'boolean',
    required: 'when_visible',
    validation: [
      { accepted: true, message_key: 'optional_figures_not_reviewed' },
    ],
    sort_row: 10_003,
    note: TRUST_CLOSING_NOTE,
  }),
  pocField({
    label: 'Plazo del contrato',
    label_en: 'Term of the contract',
    key: 'trust_contract_term',
    section: 'trust-closing',
    block: 'trust-closing',
    type: 'string',
    required: 'when_visible',
    sort_row: 10_004,
    note: TRUST_CLOSING_NOTE,
  }),
  pocField({
    label: 'Fecha de la última modificación del contrato',
    label_en: 'Date of the last amendment of the contract',
    key: 'trust_contract_amended_on',
    section: 'trust-closing',
    block: 'trust-closing',
    type: 'date',
    required: 'when_visible',
    help: {
      es: 'Si el contrato no ha sido modificado, es la fecha de su firma.',
      en: 'If the contract has not been amended, the date it was signed.',
    },
    sort_row: 10_005,
    note: TRUST_CLOSING_NOTE,
  }),
];

const SHORTCUT_NOTE =
  'POC accionistas.ts administradorRelacionado (ITDFCJ-45 CA 8, ITDFCJ-47 CA 5): optional shortcut, shown once some administrator is registered (computed `administrators_registered`). Choosing one copies its person type and identification (never the name), and the known-person recognition fills the rest; options are built by the zone from the administrators (value: their identification `<type>|<number>`, lowercase, else `#<index>`). Stored with the item; the bank catalog is not read.';
const NO_BENEFICIAL_OWNER_NOTE =
  'POC accionistas.ts CONSTANCIA_BENEFICIARIO (ITDFCJ-47 CA 9): once the calculation ran (structure confirmed) and no natural person reached the threshold (computed `ownership_without_beneficial_owner`), the reason is recorded; the detail only for an atomized structure. The POC reasons are a fixed list (`no-beneficial-owner-reasons`).';
const shareholderExtras: OverlayField[] = [
  pocField({
    tab: 'Accionistas',
    label: 'Si ya lo registró como administrador, elíjalo acá',
    label_en:
      'If you already registered them as an administrator, choose them here',
    key: 'shareholder_related_administrator',
    section: 'shareholders',
    block: 'shareholders',
    collection: 'shareholders',
    // No sheet row, so no sheet collection: placed in the shareholder item like the POC.
    regrouped: true,
    type: 'catalog',
    catalog: { name: 'shareholder-administrators', source: 'unknown' },
    required: OPTIONAL,
    visible_when: { field: ADMINISTRATORS_REGISTERED, eq: true },
    help: {
      es: 'Es un atajo: traemos sus datos y solo tiene que indicar en qué empresa participa y con qué porcentaje. También puede escribir su identificación más abajo y lo reconocemos automáticamente.',
      en: 'A shortcut: we bring in their data and you only state which company they hold shares in and how much. You can also type their identification below and we recognize them automatically.',
    },
    full_width: true,
    sort_row: 4.5,
    note: SHORTCUT_NOTE,
  }),
  pocField({
    tab: 'Accionistas',
    label: 'Motivo por el que no hay beneficiario final identificado',
    label_en: 'Reason why no beneficial owner is identified',
    key: 'shareholders_no_beneficial_owner_reason',
    section: 'shareholders',
    block: 'shareholders',
    type: 'catalog',
    catalog: { name: 'no-beneficial-owner-reasons', source: 'unknown' },
    required: 'when_visible',
    visible_when: { field: OWNERSHIP_WITHOUT_BENEFICIAL_OWNER, eq: true },
    full_width: true,
    sort_row: 10_010,
    note: NO_BENEFICIAL_OWNER_NOTE,
  }),
  pocField({
    tab: 'Accionistas',
    label: 'Detalle de las participaciones calculadas',
    label_en: 'Detail of the calculated holdings',
    key: 'shareholders_atomization_detail',
    section: 'shareholders',
    block: 'shareholders',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    visible_when: {
      all: [
        { field: OWNERSHIP_WITHOUT_BENEFICIAL_OWNER, eq: true },
        { field: 'shareholders_no_beneficial_owner_reason', eq: 'atomized' },
      ],
    },
    help: {
      es: 'La vista consolidada muestra la participación total de cada persona natural; aquí se resume por qué ninguna llega al umbral.',
      en: 'The consolidated view shows the total participation of each natural person; summarize here why none reaches the threshold.',
    },
    sort_row: 10_011,
    note: NO_BENEFICIAL_OWNER_NOTE,
  }),
];

const relatedPartiesOverlay: Overlay = {
  tabs: TABS.map((party) => party.tab),
  name: 'related-parties',
  entries: [
    ...holderListing,
    ...TABS.flatMap(partyEntries),
    ...shareholderExtras,
    powersReviewed,
    ...trustClosing,
  ],
  // POC: accionistas.ts, socios-relacionados.ts and fideicomiso.ts (minimo 1 each).
  // Child collections nest in the person; the sheet asks at least two personal references.
  collections: {
    ...Object.fromEntries(
      TABS.flatMap((party): [string, OverlayCollection][] => [
        [party.collection, { min_items: 1 }],
        ...childCollections(party),
      ]),
    ),
    // POC comite.ts comiteEnBloque (ITDFCJ-49 CA 3): the lone committee record cannot hold every position.
    trust_administrators: {
      min_items: 1,
      sole_item_not: {
        item: { field: 'trust_admin_role_ids', eq: 'technical-committee' },
        not: {
          all: ['president', 'secretary', 'member'].map((position) => ({
            field: 'trust_admin_committee_position_ids',
            eq: position,
          })),
        },
        message_key: 'committee_as_one',
      },
    },
  },
};

export { relatedPartiesOverlay };
