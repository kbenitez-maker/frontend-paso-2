import type { VisibilityExpr } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type { Overlay, OverlayField, OverlayRequired } from '../schema';

const TAB = 'Actividad Economica';

type Entry = Omit<OverlayField, 'tab'>;

/** Optional in the listed countries (the sheet condition cannot be modeled); required elsewhere. */
const optionalIn = (...countries: CountryCode[]): OverlayRequired =>
  Object.fromEntries(
    countries.map((country): [CountryCode, boolean] => [country, false]),
  );

/**
 * Activities of the `financial-services` sector. Codes are provisional; the sheet lists
 * them for the GIIN question (HN) and the banks for DO.
 */
const HN_FINANCIAL_ACTIVITIES = [
  'trusts-and-funds',
  'financial-leasing',
  'other-financial-activities',
  'life-insurance',
  'general-insurance',
  'reinsurance',
  'pension-funds',
  'financial-markets-administration',
  'auxiliary-financial-services',
  'auxiliary-insurance-and-pensions',
  'auxiliary-financial-other',
  'risk-damage-assessment',
  'other-auxiliary-insurance',
  'fund-management',
];

const DO_BANKING_ACTIVITIES = [
  'multiple-banks',
  'savings-credit-banks',
  'savings-loan-associations',
];

const hasOtherInstitutions = {
  field: 'has_other_financial_institutions',
  eq: true,
} as const;

/** The same condition in each listed country (a per-country `visible_when`). */
const inCountries = (
  countries: readonly CountryCode[],
  expr: VisibilityExpr,
): Partial<Record<CountryCode, VisibilityExpr>> =>
  Object.fromEntries(
    countries.map((country): [CountryCode, VisibilityExpr] => [country, expr]),
  );

const LISTED = { field: 'lists_on_stock_exchange', eq: true } as const;
/**
 * POC actividad-economica.ts: the exchange data is typed when the company is listed and the bank
 * has no exchange catalog (NI, CR) or the chosen exchange is "other".
 */
const OTHER_EXCHANGE = {
  ...inCountries(['NI', 'CR'], LISTED),
  ...inCountries(['PA', 'HN', 'SV', 'DO'], {
    all: [LISTED, { field: 'stock_exchange_id', eq: 'other' }],
  }),
};

/**
 * License questions (NI), from POC licencias-nicaragua.ts and actividad-economica.ts
 * (PREGUNTAS_DE_LICENCIA): asked at the end of "Actividad y sector" for the activities of each
 * pattern. Activity codes are the NI rows of the `economic-activities` catalog. The
 * wildlife pattern (`faunaSilvestre`) has no question in the POC, so it has no field.
 */
const LICENSE_PATTERN_ACTIVITIES = {
  P1: ['auto-lots', 'gold-traders', 'wholesale-trade'],
  P3: ['fuel-trade'],
  P4: ['road-freight', 'international-transport'],
  P6: ['water-air-transport'],
} as const;

const licenseQuestion = (
  pattern: keyof typeof LICENSE_PATTERN_ACTIVITIES,
  sortRow: number,
  field: Pick<
    OverlayField,
    'label' | 'label_en' | 'key' | 'type' | 'catalog' | 'help'
  >,
): Entry => ({
  ...field,
  poc_only: true,
  countries: ['NI'],
  sort_row: sortRow,
  full_width: true,
  section: 'activity',
  block: 'activity',
  required: 'when_visible',
  visible_when: {
    field: 'economic_activity_id',

    in: [...LICENSE_PATTERN_ACTIVITIES[pattern]],
  },
  note: `Pattern ${pattern}: the POC asks it for these activities; the sheet has no row. The answer decides the license documents.`,
});

const LICENSE_QUESTIONS: Entry[] = [
  licenseQuestion('P1', 15.1, {
    label: '¿Importa o exporta?',
    label_en: 'Do you import or export?',
    key: 'license_trade_direction_id',
    type: 'catalog',
    catalog: { name: 'license-trade-directions', source: 'unknown' },
    help: {
      es: 'Exportar pide la constancia de VUCEN; importar, la licencia de la DGA; ambos, las dos.',
      en: 'Exporting requires the VUCEN certificate; importing, the DGA license; both, the two of them.',
    },
  }),
  licenseQuestion('P3', 15.2, {
    label: '¿El negocio es una gasolinera?',
    label_en: 'Is the business a gas station?',
    key: 'license_is_gas_station',
    type: 'boolean',
    help: {
      es: 'Si lo es, se suma la escritura de propiedad o la concesión de la gasolinera.',
      en: 'If it is, the gas station title deed or concession is added.',
    },
  }),
  licenseQuestion('P4', 15.3, {
    label: '¿Qué tipo de carga transporta?',
    label_en: 'What type of cargo do you transport?',
    key: 'license_cargo_type_id',
    type: 'catalog',
    catalog: { name: 'license-cargo-types', source: 'unknown' },
    help: {
      es: 'De la carga depende el ente que la autoriza: INAFOR, MARENA o MTI.',
      en: 'The cargo decides the authorizing body: INAFOR, MARENA or MTI.',
    },
  }),
  licenseQuestion('P6', 15.4, {
    label: '¿Por qué medio presta el servicio de transporte?',
    label_en: 'By what means do you provide the transport service?',
    key: 'license_transport_mode_id',
    type: 'catalog',
    catalog: { name: 'license-transport-modes', source: 'unknown' },
    help: {
      es: 'Aéreo lo autoriza INAC; por agua, el MTI.',
      en: 'Air transport is authorized by INAC; water transport, by MTI.',
    },
  }),
];

const BY_PERSON_NOTE =
  'POC actividad-economica.ts shows it by person type in every country and requires it; the sheet leaves SV (and PA suppliers) without a condition. POC wins.';

const OPTIONAL_NAME_NOTE =
  'Second names are optional by nature; the sheet gives no requirement.';

/**
 * Same item layout for customers and suppliers; only the key prefix and the country scope differ.
 * `byPerson` lists the countries where the sheet shows legal or natural fields by "Tipo de persona"
 * (a sibling of the same item); `optional` the countries where the sheet leaves it unclear (SV:
 * legal name always visible, natural names with no visibility), so the fields stay optional there.
 */
const counterpartyEntries = (
  who: 'client' | 'supplier',
  header: string,
  collection: string,
  byPerson: { natural: CountryCode[]; birthCountries?: CountryCode[] },
): Entry[] => {
  const countryOverride =
    byPerson.birthCountries === undefined ?
      {}
    : {
        countries: byPerson.birthCountries,
        note: 'POC actividad-economica.ts asks the supplier countries in PA too (the sheet: HN only). POC wins.',
      };
  const base = { section: 'counterparties', block: 'counterparties' } as const;
  const item = { ...base, collection, section_header: header } as const;
  const personType = `${who}_person_type_id`;
  const legal = { field: personType, eq: 'legal' } as const;
  const natural = { field: personType, eq: 'natural' } as const;
  // POC actividad-economica.ts: legal name and names by person type in every country, required.
  const naturalName = {
    ...item,
    type: 'string',
    required: 'when_visible',
    visible_when: natural,
    note: BY_PERSON_NOTE,
  } as const;
  return [
    {
      ...item,
      label: 'Tipo de persona',
      label_en: 'Person type',
      key: personType,
      full_width: true,
      type: 'catalog',
      required: 'when_visible',
      catalog: { name: 'counterparty-person-types', source: 'unknown' },
      note: "Typed Checkbox in the sheet, but the choice is exclusive: modeled as a catalog ('legal' / 'natural', provisional codes).",
    },
    {
      ...item,
      label: 'Razón social',
      label_en: 'Legal name',
      key: `${who}_legal_name`,
      full_width: true,
      type: 'string',
      required: 'when_visible',
      visible_when: legal,
      note: BY_PERSON_NOTE,
    },
    {
      ...naturalName,
      label: 'Primer Nombre',
      label_es: 'Primer nombre',
      label_en: 'First name',
      key: `${who}_first_name`,
    },
    {
      ...naturalName,
      label: 'Segundo Nombre',
      label_es: 'Segundo nombre',
      label_en: 'Middle name',
      key: `${who}_middle_name`,
      required: optionalIn(...byPerson.natural),
      note: OPTIONAL_NAME_NOTE,
    },
    {
      ...naturalName,
      label: 'Primer Apellido',
      label_es: 'Primer apellido',
      label_en: 'Last name',
      key: `${who}_last_name`,
    },
    {
      ...naturalName,
      label: 'Segundo Apellido',
      label_es: 'Segundo apellido',
      label_en: 'Second last name',
      key: `${who}_second_last_name`,
      required: optionalIn(...byPerson.natural),
      note: OPTIONAL_NAME_NOTE,
    },
    {
      ...item,
      label: 'Tipo de identificación',
      label_en: 'Identification type',
      key: `${who}_identification_type_id`,
      type: 'catalog',
      required: 'when_visible',
      catalog: { name: 'identification-types', source: 'unknown' },
    },
    {
      ...item,
      label: 'No. de identificación',
      label_en: 'Identification number',
      key: `${who}_identification_number`,
      type: 'string',
      required: 'when_visible',
    },
    {
      ...item,
      label: 'Dirección detallada',
      label_en: 'Detailed address',
      key: `${who}_address_detail`,
      type: 'string',
      multiline: true,
      required: 'when_visible',
    },
    {
      ...item,
      label: 'País de constitución',
      label_en: 'Country of incorporation',
      key: `${who}_incorporation_country_id`,
      type: 'catalog',
      required: 'when_visible',
      catalog: { name: 'countries', source: 'unknown' },
      visible_when: legal,
      ...countryOverride,
    },
    {
      ...item,
      label: 'País Nacimiento',
      label_es: 'País de nacimiento',
      label_en: 'Country of birth',
      key: `${who}_birth_country_id`,
      type: 'catalog',
      required: 'when_visible',
      catalog: { name: 'countries', source: 'unknown' },
      visible_when: natural,
      ...countryOverride,
    },
    {
      ...item,
      label: 'Teléfono de contacto',
      label_en: 'Contact phone',
      key: `${who}_phone`,
      type: 'phone',
      required: 'when_visible',
      note: 'Typed Entero in the sheet; modeled as a phone (dial code + number) like the POC. POC actividad-economica.ts requires it (PA included); the sheet rule "phone or email" in PA is a help text there.',
    },
    {
      ...item,
      label: 'Correo de contacto',
      label_en: 'Contact email',
      key: `${who}_email`,
      type: 'email',
      required: optionalIn('PA', 'HN'),
      note: 'Typed Texto in the sheet; modeled as email. Optional per the POC; see the phone note for the PA rule.',
    },
  ];
};

const entries: Entry[] = [
  // Activity and sector
  {
    label: 'Objeto social',
    label_en: 'Corporate purpose',
    key: 'corporate_purpose',
    section: 'activity',
    block: 'activity',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    countries: ['NI', 'SV'],
    note: 'POC actividad-economica.ts asks it in NI and SV (the sheet: NI only). POC wins.',
  },
  {
    label: 'Sector al que pertenece la empresa',
    label_en: 'Sector the company belongs to',
    key: 'company_sector_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'company-sectors', source: 'unknown' },
    countries: ['PA', 'CR'],
    note: 'POC actividad-economica.ts asks it in PA and CR (the sheet: PA only). POC wins.',
  },
  {
    label: 'Actividad del negocio',
    label_en: 'Business activity',
    key: 'business_activity_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'business-activities', source: 'unknown' },
    countries: ['NI', 'PA', 'CR', 'HN', 'SV'],
    note: 'POC actividad-economica.ts asks it in NI, PA, CR, HN and SV (the sheet: NI, CR and HN). POC wins.',
  },
  {
    label: 'Sector económico',
    label_en: 'Economic sector',
    key: 'economic_sector_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'economic-sectors', source: 'unknown' },
    note: "Sheet: depends on 'Actividad del negocio' where that field applies (NI, CR, HN). A catalog parent is one per field, not per country, and the parent is absent in PA, SV and DO, so it is not chained. Sheet: a prohibited economic activity pauses the request (runtime business rule, not modeled). Option codes used in conditions (construction, non-bank-lenders) are provisional.",
  },
  {
    label: 'Categoría de actividad económica',
    label_en: 'Economic activity category',
    key: 'economic_category_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'economic-activity-categories', source: 'unknown' },
    sort_row: 14.1,
    note: 'POC actividad-economica.ts asks the CR category and subcategory after the audit firm, at the end of the block.',
  },
  {
    label: 'Sub - categoría de actividad económica',
    label_es: 'Sub-categoría de actividad económica',
    label_en: 'Economic activity subcategory',
    key: 'economic_subcategory_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: {
      name: 'economic-activity-subcategories',
      parent: 'economic_category_id',
      source: 'unknown',
    },
    sort_row: 14.2,
    note: 'POC order: right after the category, at the end of the block. Sheet visibility (CR): depends on the category field; the dependent select stays disabled until the category is chosen.',
  },
  {
    label: 'Actividad económica',
    label_en: 'Economic activity',
    key: 'economic_activity_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: {
      name: 'economic-activities',
      parent: 'economic_sector_id',
      source: 'unknown',
    },
    note: 'Chained to the economic sector. Sheet: in CR it depends on the subcategory instead and is visible once one is chosen (not modeled: always visible, filtered by sector). A prohibited activity pauses the request (runtime business rule, not modeled). The catalog should carry boolean flags (operational activity, applies to FFI) that other rows read; they are not modeled.',
  },
  {
    label: 'Perfil de operaciones de la empresa',
    label_en: 'Company operations profile',
    key: 'operations_profile_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'operations-profiles', source: 'unknown' },
    note: 'Sheet (PA): visible according to an operational-activity flag of the economic activity catalog, which does not exist yet; modeled as always visible.',
  },
  {
    label: 'Describa detalladamente la actividad económica',
    label_en: 'Describe the economic activity in detail',
    key: 'activity_description',
    section: 'activity',
    block: 'activity',
    type: 'string',
    multiline: true,
    required: 'when_visible',
  },
  {
    label: '¿La empresa compra y vende inmuebles?',
    label_en: 'Does the company buy and sell real estate?',
    key: 'buys_sells_real_estate',
    section: 'activity',
    block: 'activity',
    type: 'boolean',
    required: 'when_visible',
    visible_when: { field: 'economic_sector_id', eq: 'construction' },
  },
  {
    label: 'Escriba el nombre del regulador o entidad que lo supervisa',
    label_en: 'Name of the regulator or supervising entity',
    key: 'supervising_regulator_name',
    section: 'activity',
    block: 'activity',
    type: 'string',
    required: 'when_visible',
    visible_when: { field: 'economic_sector_id', eq: 'non-bank-lenders' },
  },
  {
    label: 'Escriba el nombre de la firma auditora externa',
    label_en: 'Name of the external audit firm',
    key: 'external_audit_firm_name',
    section: 'activity',
    block: 'activity',
    type: 'string',
    required: 'when_visible',
    visible_when: { field: 'economic_sector_id', eq: 'non-bank-lenders' },
  },
  {
    label:
      '¿La empresa se encuentra inscrita en el registro de transparencia y beneficiarios finales (RTBF)?',
    label_en:
      'Is the company registered in the transparency and beneficial owners registry (RTBF)?',
    key: 'rtbf_status_id',
    section: 'activity',
    block: 'activity',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'rtbf-statuses', source: 'unknown' },
    note: "Typed Catalogo here (a boolean in 'Datos de la Empresa', key registered_in_rtbf); the option codes are provisional.",
  },
  ...LICENSE_QUESTIONS,
  // Tax identification and FATCA
  {
    label: 'Número de Identificación del Empleador (EIN)',
    label_en: 'Employer Identification Number (EIN)',
    key: 'employer_identification_number',
    full_width: true,
    section: 'tax-id',
    block: 'tax-id',
    type: 'string',
    required: 'when_visible',
    note: "POC actividad-economica.ts asks it always and requires it. Sheet: visible when the country of incorporation is the United States, a field of another tab ('Datos de la Empresa'); conditions only reference the same overlay, so it is always visible and optional.",
  },
  {
    label:
      '¿La entidad financiera cuenta con un número de Identificación de Intermediario Global (GIIN)?',
    label_en:
      'Does the financial institution have a Global Intermediary Identification Number (GIIN)?',
    key: 'has_giin',
    section: 'tax-id',
    block: 'tax-id',
    type: 'boolean',
    required: optionalIn('PA'),
    visible_when: {
      HN: { field: 'economic_activity_id', in: HN_FINANCIAL_ACTIVITIES },
      DO: { field: 'economic_activity_id', in: DO_BANKING_ACTIVITIES },
    },
    note: 'Sheet: HN and DO also require the country of incorporation to differ from the United States (field of another tab, not modeled); only the activity part is. PA depends on an FFI flag of the activity catalog that does not exist, so it is always visible and optional there. NI, CR and SV are always visible.',
  },
  {
    label: 'Indique el número de Identificación de Intermediario Global (GIIN)',
    label_en: 'Global Intermediary Identification Number (GIIN)',
    key: 'giin',
    full_width: true,
    section: 'tax-id',
    block: 'tax-id',
    type: 'string',
    required: 'when_visible',
    visible_when: { field: 'has_giin', eq: true },
    note: 'Sheet lists CR, NI and SV as always visible, but the question that gates it also exists there; gated by the answer in every country (as in the POC).',
  },
  {
    label: '¿La entidad opera como una FINTECH?',
    label_en: 'Does the entity operate as a FINTECH?',
    key: 'is_fintech',
    section: 'tax-id',
    block: 'tax-id',
    type: 'boolean',
    required: 'when_visible',
  },
  // Stock exchange
  {
    label: '¿La empresa cotiza sus acciones en la bolsa de valores?',
    label_en: 'Does the company list its shares on a stock exchange?',
    key: 'lists_on_stock_exchange',
    section: 'stock-exchange',
    block: 'stock-exchange',
    type: 'boolean',
    required: 'when_visible',
    note: 'POC actividad-economica.ts requires the answer once shown. Sheet (PA, CR, HN, DO): visible according to the legal entity type (shareholder-structure flag), a field of another tab; modeled as always visible and optional there. NI and SV are always visible.',
  },
  {
    label: 'Seleccione la bolsa de valores',
    label_en: 'Select the stock exchange',
    key: 'stock_exchange_id',
    full_width: true,
    section: 'stock-exchange',
    block: 'stock-exchange',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'stock-exchanges', source: 'unknown' },
    visible_when: { field: 'lists_on_stock_exchange', eq: true },
    countries: ['PA', 'HN', 'SV', 'DO'],
    note: "POC actividad-economica.ts has an exchange catalog in PA, DO, HN and SV only (the sheet: every country); NI and CR type the exchange directly. Per-bank catalog; each bank's list ends with 'other' (provisional code).",
  },
  {
    label: 'Indicar el nombre de la bolsa de valores',
    label_en: 'Name of the stock exchange',
    key: 'other_stock_exchange_name',
    section: 'stock-exchange',
    block: 'stock-exchange',
    type: 'string',
    required: 'when_visible',
    visible_when: OTHER_EXCHANGE,
    note: 'Sheet lists NI and SV as always visible; they get the same condition as the rest (as in the POC), since the exchange catalog applies to them too.',
  },
  {
    label: 'Indicar el país de la bolsa de valores',
    label_en: 'Country of the stock exchange',
    key: 'stock_exchange_country_id',
    section: 'stock-exchange',
    block: 'stock-exchange',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'countries', source: 'unknown' },
    visible_when: OTHER_EXCHANGE,
    note: 'Sheet: a prohibited country pauses the request (runtime business rule, not modeled). NI and SV condition as in the name field.',
  },
  {
    label: 'URL del perfil de cotización en la bolsa de valores',
    label_en: 'Stock exchange listing profile URL',
    key: 'stock_exchange_profile_url',
    full_width: true,
    section: 'stock-exchange',
    block: 'stock-exchange',
    type: 'url',
    required: 'when_visible',
    visible_when: OTHER_EXCHANGE,
    note: 'Typed Texto in the sheet, which asks for URL format: modeled as url. POC actividad-economica.ts shows it with the name and country of the exchange.',
  },
  // Financial information
  {
    label: 'Capital Inicial US$',
    label_en: 'Initial capital US$',
    key: 'initial_capital_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
  },
  {
    label: 'Capital social US$',
    label_en: 'Share capital US$',
    key: 'share_capital_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    validation: [{ min: 0 }],
  },
  {
    label: 'Capital suscrito y pagado US$',
    label_en: 'Subscribed and paid-in capital US$',
    key: 'paid_in_capital_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    validation: [
      { min: 0 },
      { lte_field: 'share_capital_usd', message_key: 'exceeds_share_capital' },
    ],
    note: "Sheet and POC actividad-economica.ts (noMayorQue('capitalSocial'), ITDFCJ-18 CA-4): not greater than share capital, error on this field. Share capital applies to DO only, so the comparison is skipped in PA.",
  },
  {
    label: 'Ventas mensuales en $',
    label_en: 'Monthly sales in $',
    key: 'monthly_sales',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
  },
  {
    label: 'Ventas anuales en US$',
    label_en: 'Annual sales US$',
    key: 'annual_sales_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    validation: [{ min: 0 }],
    preload_from: 'annual_sales_usd',
    note: "Preloaded from profiling ('Punto de contacto'); stays editable so the applicant can correct the estimate.",
  },
  {
    label: 'Ingresos anuales en US$',
    label_en: 'Annual income US$',
    key: 'annual_income_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
  },
  {
    label: 'Fuente de ingresos',
    label_en: 'Source of income',
    key: 'income_source_id',
    section: 'financial',
    block: 'financial',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'income-sources', source: 'unknown' },
  },
  {
    label: 'Porcentaje de ingresos en efectivo',
    label_en: 'Percentage of cash income',
    key: 'cash_income_percentage',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    validation: [{ min: 0 }, { max: 100 }],
  },
  {
    label: '¿La empresa tiene otros ingresos?',
    label_en: 'Does the company have other income?',
    key: 'has_other_income',
    section: 'financial',
    block: 'financial',
    type: 'boolean',
    required: 'when_visible',
  },
  {
    label: 'Otros ingresos U$',
    label_es: 'Otros ingresos US$',
    label_en: 'Other income US$',
    key: 'other_income_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    visible_when: { field: 'has_other_income', eq: true },
  },
  {
    label: 'Breve descripción de la fuente que genera los otros ingresos',
    label_en: 'Brief description of the source of the other income',
    key: 'other_income_description',
    section: 'financial',
    block: 'financial',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    visible_when: { field: 'has_other_income', eq: true },
  },
  {
    label: 'Total pasivo',
    label_en: 'Total liabilities',
    key: 'total_liabilities',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    validation: [
      { min: 0 },
      { lte_field: 'total_assets', message_key: 'exceeds_total_assets' },
    ],
    note: "POC actividad-economica.ts (noMayorQue('totalActivo'), ITDFCJ-18 CA-4): not greater than total assets, error on this field.",
  },
  {
    label: 'Total activo',
    label_en: 'Total assets',
    key: 'total_assets',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
    validation: [{ min: 0 }],
  },
  {
    label: 'Egresos anuales $',
    label_es: 'Egresos anuales US$',
    label_en: 'Annual expenses US$',
    key: 'annual_expenses_usd',
    section: 'financial',
    block: 'financial',
    type: 'decimal',
    required: 'when_visible',
  },
  {
    label: '¿Su empresa cuenta con otras instituciones financieras?',
    label_en: 'Does your company have other financial institutions?',
    key: 'has_other_financial_institutions',
    section: 'other-institutions',
    block: 'other-institutions',
    type: 'boolean',
    required: 'when_visible',
  },
  {
    label: 'Banco / Institución',
    label_en: 'Bank / Institution',
    key: 'other_institution_id',
    section: 'other-institutions',
    block: 'other-institutions',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'other-financial-institutions', source: 'unknown' },
    visible_when: hasOtherInstitutions,
  },
  {
    label: 'Fecha inicio relación',
    label_es: 'Fecha de inicio de la relación',
    label_en: 'Relationship start date',
    key: 'other_institution_since',
    section: 'other-institutions',
    block: 'other-institutions',
    type: 'date',
    required: 'when_visible',
    visible_when: hasOtherInstitutions,
    validation: [{ not_future: true }],
  },
  {
    label: 'Tipo de cuenta',
    label_en: 'Account type',
    key: 'other_institution_account_type_id',
    section: 'other-institutions',
    block: 'other-institutions',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'other-institution-account-types', source: 'unknown' },
    visible_when: hasOtherInstitutions,
  },
  {
    label: 'Moneda',
    label_en: 'Currency',
    key: 'other_institution_currency_id',
    section: 'other-institutions',
    block: 'other-institutions',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'currencies', source: 'unknown' },
    visible_when: hasOtherInstitutions,
  },
  {
    label: 'Monto promedio',
    label_en: 'Average amount',
    key: 'other_institution_average_amount',
    section: 'other-institutions',
    block: 'other-institutions',
    type: 'decimal',
    required: 'when_visible',
    visible_when: hasOtherInstitutions,
  },
  // Customers and suppliers (the "[Inicio]" / "[Fin]" marker rows carry no field)
  ...counterpartyEntries('client', 'Información de Clientes', 'clients', {
    natural: ['NI', 'PA', 'HN', 'SV'],
  }),
  ...counterpartyEntries(
    'supplier',
    'Información de Proveedores',
    'suppliers',
    { natural: ['NI', 'HN', 'SV'], birthCountries: ['PA', 'HN'] },
  ),
];

const economicActivityOverlay: Overlay = {
  tabs: [TAB],
  name: 'economic-activity',
  entries: entries.map((entry) => ({ tab: TAB, ...entry })),
  // POC: actividad-economica.ts (clientes and proveedores, minimo 1 each).
  collections: { clients: { min_items: 1 }, suppliers: { min_items: 1 } },
};

export { economicActivityOverlay };
