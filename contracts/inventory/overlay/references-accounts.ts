import type { VisibilityExpr } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type { Overlay, OverlayEntry, OverlayField } from '../schema';

const REFERENCES_TAB = 'Referencias';
const ACCOUNTS_TAB = 'Cuentas';

type Entry = Omit<OverlayField, 'tab' | 'section' | 'block'>;

/** Required everywhere except the listed countries (the sheet makes the field conditional there). */
const optionalIn = (
  ...countries: CountryCode[]
): Partial<Record<CountryCode, boolean>> =>
  Object.fromEntries(countries.map((country) => [country, false]));

const references = (entry: Entry): OverlayField => ({
  tab: REFERENCES_TAB,
  section: 'references',
  block: 'references',
  ...entry,
});

const accounts = (entry: Entry): OverlayField => ({
  tab: ACCOUNTS_TAB,
  section: 'account-info',
  block: 'accounts',
  ...entry,
});

const transfers = (entry: Entry): OverlayField => ({
  tab: ACCOUNTS_TAB,
  section: 'account-info',
  block: 'accounts',
  regrouped: true,
  note: 'POC cuentas.ts: transfers belong to each account (its "Transferencias" tab); the sheet lists them after "Cuentas [Fin]".',
  ...entry,
});

// Conditions on sibling fields of the same item (reference, account, card, signer).
const COMMERCIAL = { field: 'reference_type_id', eq: 'commercial' } as const;
const LEGAL = { field: 'reference_person_kind_id', eq: 'legal' } as const;
const NATURAL = { field: 'reference_person_kind_id', eq: 'natural' } as const;
const CHECKING = { field: 'account_type_id', eq: 'checking' } as const;
const JOINT = { field: 'signature_type_id', eq: 'joint' } as const;
/** Parent account answer that opens the additional cards (POC cuentas.ts `deseaTarjeta`). */
const WANTS_CARD = { field: 'wants_debit_card', eq: true } as const;
const cardWhen = (extra?: VisibilityExpr): VisibilityExpr =>
  extra === undefined ? WANTS_CARD : { all: [WANTS_CARD, extra] };
/** POC cuentas.ts asks the new card holder's data in NI, CR and DO; the sheet leaves NI out. */
const CARD_HOLDER_COUNTRIES: readonly CountryCode[] = ['NI', 'CR', 'DO'];
const CARD_HOLDER_NOTE =
  'POC cuentas.ts asks the card holder data in NI too (the sheet: CR and DO only). POC wins.';
/** POC cuentas.ts sets no condition on these account fields; the sheet does (see each note). */
const POC_NO_CONDITION = 'POC cuentas.ts shows it with no condition';
const RELATED_CARD = { field: 'card_for_related_party', eq: true } as const;
const NEW_CARD_HOLDER = { field: 'card_for_related_party', eq: false } as const;
const PROFILE_NOTE =
  'Amounts and counts of the expected transactional profile of the account.';

const MIN_ZERO = [{ min: 0 }];

/** PA amounts by instrument (POC cuentas.ts `sumaDe`): deposits to receive, withdrawals to send. */
const INSTRUMENTS = ['cash', 'checks', 'international', 'regional', 'ach'];
const IN_AMOUNTS = INSTRUMENTS.map((instrument) => `${instrument}_in_amount`);
const OUT_AMOUNTS = INSTRUMENTS.map((instrument) => `${instrument}_out_amount`);
/** Annual sales of the economic-activity step (POC `ventasAnuales`); the API passes it as context. */
const ANNUAL_SALES = 'annual_sales_usd';
const CREDITS_EXCEED_SALES = 'credits_exceed_sales';
const DEBITS_EXCEED_CREDITS = 'debits_exceed_credits';

/**
 * POC referencias.ts `esManual`: the typed data of a reference is asked unless
 * it is a commercial reference taken from a registered customer or supplier.
 */
const MANUAL_REFERENCE = {
  any: [
    { field: 'reference_type_id', neq: 'commercial' },
    { field: 'use_registered_counterparties', neq: true },
  ],
} as const;
const manualAnd = (expr: VisibilityExpr): VisibilityExpr => ({
  all: [MANUAL_REFERENCE, expr],
});
const POC_REFERENCE_NOTE =
  'POC referencias.ts conditions the typed data only on the manual branch (and the person type for names); the sheet also conditions it on the reference type. POC wins.';

const referenceEntries: OverlayField[] = [
  references({
    label:
      '¿Quiere seleccionar como referencias comerciales a alguno de los clientes o proveedores anteriormente registrados?',
    label_en:
      'Do you want to use any previously registered customers or suppliers as commercial references?',
    key: 'use_registered_counterparties',
    collection: 'references',
    regrouped: true,
    sort_row: 6.1,
    type: 'boolean',
    required: 'when_visible',
    visible_when: COMMERCIAL,
    note: 'POC referencias.ts asks it inside each reference, after the reference type, for commercial references only (the sheet asks it once above the list). The POC also hides it when no customer or supplier is registered; that depends on the economic-activity step and is not modeled.',
  }),
  references({
    label: 'Seleccione los clientes o proveedores',
    label_es: 'Seleccione el cliente o proveedor',
    label_en: 'Select the customer or supplier',
    key: 'registered_counterparty_id',
    full_width: true,
    collection: 'references',
    regrouped: true,
    sort_row: 6.2,
    type: 'catalog',
    required: 'when_visible',
    catalog: {
      name: 'related-persons',
      source: 'request',
      roles: ['client', 'supplier'],
    },
    visible_when: {
      all: [COMMERCIAL, { field: 'use_registered_counterparties', eq: true }],
    },
    note: 'POC referencias.ts: one customer or supplier per reference (single choice), whose data is copied into it; the sheet asks for several at once above the list. Options are the customers and suppliers of the economic-activity step (POC contrapartesRegistradas); copying their data is not modeled.',
  }),
  references({
    label: 'Tipo de referencia',
    label_en: 'Reference type',
    key: 'reference_type_id',
    full_width: true,
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'reference-types', source: 'unknown' },
    note: 'Sheet types it Checkbox, but the choice is exclusive (commercial or bank), so it is a single catalog. Option codes are provisional.',
  }),
  references({
    label: 'Tipo de persona',
    label_en: 'Type of person',
    key: 'reference_person_kind_id',
    full_width: true,
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'reference-person-kinds', source: 'unknown' },
    note: 'Sheet types it Checkbox, but the choice is exclusive (natural or legal). Option codes are provisional.',
  }),
  references({
    label: 'Razón social',
    label_en: 'Legal name',
    key: 'reference_legal_name',
    full_width: true,
    collection: 'references',
    type: 'string',
    required: 'when_visible',
    visible_when: manualAnd(LEGAL),
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Primer nombre',
    label_en: 'First name',
    key: 'reference_first_name',
    collection: 'references',
    type: 'string',
    required: 'when_visible',
    visible_when: manualAnd(NATURAL),
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Segundo nombre',
    label_en: 'Middle name',
    key: 'reference_middle_name',
    collection: 'references',
    type: 'string',
    required: optionalIn('NI', 'HN', 'SV'),
    visible_when: manualAnd(NATURAL),
    note: `${POC_REFERENCE_NOTE} Second names are optional by nature.`,
  }),
  references({
    label: 'Primer apellido',
    label_en: 'First last name',
    key: 'reference_last_name',
    collection: 'references',
    type: 'string',
    required: 'when_visible',
    visible_when: manualAnd(NATURAL),
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Segundo apellido',
    label_en: 'Second last name',
    key: 'reference_second_last_name',
    collection: 'references',
    type: 'string',
    required: optionalIn('NI', 'HN', 'SV'),
    visible_when: manualAnd(NATURAL),
    note: `${POC_REFERENCE_NOTE} Second names are optional by nature.`,
  }),
  references({
    label: 'Telefono',
    label_es: 'Teléfono',
    label_en: 'Phone',
    key: 'reference_phone',
    collection: 'references',
    type: 'phone',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    note: 'Sheet types it Entero; modeled as a phone (dial code + number) like the POC.',
  }),
  references({
    label: 'Tipo de identificación',
    label_en: 'Identification type',
    key: 'reference_identification_type_id',
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'identification-types', source: 'unknown' },
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Numero de identificacion',
    label_es: 'Número de identificación',
    label_en: 'Identification number',
    key: 'reference_identification_number',
    collection: 'references',
    type: 'string',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Dirección',
    label_en: 'Address',
    key: 'reference_address',
    collection: 'references',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'País de constitución',
    label_en: 'Country of incorporation',
    key: 'reference_incorporation_country_id',
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'countries', source: 'unknown' },
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'País de nacimiento',
    label_en: 'Country of birth',
    key: 'reference_birth_country_id',
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'countries', source: 'unknown' },
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Seleccione el banco o institución',
    label_en: 'Select the bank or institution',
    key: 'reference_bank_id',
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'banks', source: 'unknown' },
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Indique nombre del banco o institución',
    label_en: 'Enter the name of the bank or institution',
    key: 'reference_bank_name',
    collection: 'references',
    type: 'string',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    note: 'POC referencias.ts asks it in NI, HN and SV on the manual branch, next to the HN bank catalog with no rule between them; the sheet shows it when the bank is "other", but the bank catalog only applies to HN. POC wins.',
  }),
  references({
    label: 'Tipo de cuenta',
    label_en: 'Account type',
    key: 'reference_account_type_id',
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'account-types', source: 'unknown' },
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Moneda',
    label_en: 'Currency',
    key: 'reference_currency_id',
    collection: 'references',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    catalog: { name: 'account-currencies', source: 'unknown' },
    note: POC_REFERENCE_NOTE,
  }),
  references({
    label: 'Antigüedad de la cuenta',
    label_en: 'Account age',
    key: 'reference_account_age',
    collection: 'references',
    type: 'string',
    required: 'when_visible',
    visible_when: MANUAL_REFERENCE,
    max_length: 50,
    note: `${POC_REFERENCE_NOTE} Sheet types it Texto although it reads as a number or a date; kept as free text.`,
  }),
];

const accountEntries: OverlayField[] = [
  accounts({
    label: 'Tipo de cuenta',
    label_en: 'Account type',
    key: 'account_type_id',
    collection: 'accounts',
    item_tab: 'setup',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'account-types', source: 'unknown' },
    note: 'Option codes used by the sheet conditions are provisional (checking, savings); replace with core codes.',
  }),
  accounts({
    label: 'Seleccione el tipo de cuenta corriente',
    label_en: 'Select the type of checking account',
    key: 'checking_account_type_id',
    collection: 'accounts',
    item_tab: 'setup',
    type: 'catalog',
    required: 'when_visible',
    visible_when: CHECKING,
    catalog: { name: 'checking-account-types', source: 'unknown' },
  }),
  accounts({
    label: 'Moneda de la cuenta',
    label_en: 'Account currency',
    key: 'account_currency_id',
    collection: 'accounts',
    item_tab: 'setup',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'account-currencies', source: 'unknown' },
    note: 'BLPA sheet note: savings accounts are only offered in US dollars (filter by account type, not modeled).',
  }),
  accounts({
    label: 'Medio de depósito inicial',
    label_en: 'Initial deposit method',
    key: 'initial_deposit_method_id',
    collection: 'accounts',
    item_tab: 'setup',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'initial-deposit-methods', source: 'unknown' },
    note: `${POC_NO_CONDITION}; the sheet shows it in DO for checking accounts only.`,
  }),
  accounts({
    label: 'Depósito inicial a su cuenta',
    label_en: 'Initial deposit to your account',
    key: 'initial_deposit_amount',
    collection: 'accounts',
    item_tab: 'setup',
    type: 'decimal',
    required: 'when_visible',
    validation: MIN_ZERO,
  }),
  accounts({
    label: 'Origen del depósito inicial',
    label_en: 'Origin of the initial deposit',
    key: 'initial_deposit_origin_id',
    collection: 'accounts',
    item_tab: 'setup',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'deposit-origins', source: 'unknown' },
  }),
  accounts({
    label: '¿Requiere chequera?',
    label_en: 'Does it require a checkbook?',
    key: 'requires_checkbook',
    collection: 'accounts',
    item_tab: 'checkbook_card',
    type: 'boolean',
    required: 'when_visible',
    note: `${POC_NO_CONDITION} and required; the sheet shows it in NI for checking accounts only and leaves PA without visibility.`,
  }),
  accounts({
    label: 'Tipo de chequera',
    label_en: 'Checkbook type',
    key: 'checkbook_type_id',
    collection: 'accounts',
    item_tab: 'checkbook_card',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'checkbook-types', source: 'unknown' },
    note: `${POC_NO_CONDITION} and required; the sheet shows it in HN with a checkbook, in DO with the checkbook deposit method and leaves PA without visibility.`,
  }),
  accounts({
    label: 'Indique la cantidad de chequeras',
    label_en: 'Number of checkbooks',
    key: 'checkbook_quantity',
    collection: 'accounts',
    item_tab: 'checkbook_card',
    type: 'integer',
    required: 'when_visible',
    validation: [{ min: 1 }],
    note: `${POC_NO_CONDITION} and required; the sheet shows it in HN with a checkbook, in DO with the checkbook deposit method, leaves PA without visibility and asks one quantity per checkbook type (not modeled).`,
  }),
  accounts({
    label: 'Cantidad de cheques',
    label_en: 'Number of checks',
    key: 'check_quantity',
    collection: 'accounts',
    item_tab: 'checkbook_card',
    type: 'integer',
    required: optionalIn('NI'),
    visible_when: { field: 'requires_checkbook', eq: true },
    validation: MIN_ZERO,
    note: 'Sheet leaves visibility empty; shown with a checkbook and optional.',
  }),
  accounts({
    label: '¿Desea tarjeta débito para su cuenta?',
    label_en: 'Do you want a debit card for your account?',
    key: 'wants_debit_card',
    collection: 'accounts',
    item_tab: 'checkbook_card',
    type: 'boolean',
    required: 'when_visible',
    note: `${POC_NO_CONDITION}; the sheet shows it in NI for checking accounts and in DO for savings accounts in DOP.`,
  }),
  accounts({
    label: '¿Asignará esta tarjeta a un relacionado registrado anteriormente?',
    label_en:
      'Will this card be assigned to a previously registered related party?',
    key: 'card_for_related_party',
    collection: 'additional_cards',
    type: 'boolean',
    required: 'when_visible',
    visible_when: cardWhen(),
    note: 'Child collection of the account, shown when a debit card is wanted (POC cuentas.ts). The sheet also opens it in DO with the debit card deposit method; POC wins. POC keeps one card per account as plain account fields; kept as a child collection (the sheet nests "Agregar tarjeta adicional").',
  }),
  accounts({
    label:
      'Seleccione a los firmantes o representantes previamente registrados que recibirán tarjeta adicional',
    label_en:
      'Select the previously registered signers or representatives who will receive an additional card',
    key: 'card_related_party_ids',
    collection: 'additional_cards',
    type: 'multi_catalog',
    required: 'when_visible',
    visible_when: cardWhen(RELATED_CARD),
    catalog: {
      name: 'related-persons',
      source: 'request',
      roles: ['signatory'],
      // The same signers list: losing them reads as the account's signers changing (POC avisoDeCuentas).
      unlisted_key: 'signer_unlisted',
    },
    note: 'POC cuentas.ts picks one registered signer (single choice); kept multiple like the sheet until the shared block-values test stops using this key as a multi value. Lists the related parties with the signer role (POC conRol Firmante, despite the label naming representatives). NI and CR: the sheet sets no condition; shown for a related party (POC).',
  }),
  accounts({
    label: 'Primer nombre',
    label_en: 'First name',
    key: 'card_first_name',
    collection: 'additional_cards',
    type: 'string',
    required: 'when_visible',
    visible_when: cardWhen(NEW_CARD_HOLDER),
    countries: CARD_HOLDER_COUNTRIES,
    note: CARD_HOLDER_NOTE,
  }),
  accounts({
    label: 'Segundo nombre',
    label_en: 'Middle name',
    key: 'card_middle_name',
    collection: 'additional_cards',
    type: 'string',
    required: { NI: false, CR: false, DO: false },
    visible_when: cardWhen(NEW_CARD_HOLDER),
    countries: CARD_HOLDER_COUNTRIES,
    note: `${CARD_HOLDER_NOTE} Second names are optional by nature.`,
  }),
  accounts({
    label: 'Primer apellido',
    label_en: 'First last name',
    key: 'card_last_name',
    collection: 'additional_cards',
    type: 'string',
    required: 'when_visible',
    visible_when: cardWhen(NEW_CARD_HOLDER),
    countries: CARD_HOLDER_COUNTRIES,
    note: CARD_HOLDER_NOTE,
  }),
  accounts({
    label: 'Segundo apellido',
    label_en: 'Second last name',
    key: 'card_second_last_name',
    collection: 'additional_cards',
    type: 'string',
    required: { NI: false, CR: false, DO: false },
    visible_when: cardWhen(NEW_CARD_HOLDER),
    countries: CARD_HOLDER_COUNTRIES,
    note: `${CARD_HOLDER_NOTE} Second names are optional by nature.`,
  }),
  accounts({
    label: 'Tipo de identificación',
    label_en: 'Identification type',
    key: 'card_identification_type_id',
    collection: 'additional_cards',
    type: 'catalog',
    required: 'when_visible',
    visible_when: cardWhen(NEW_CARD_HOLDER),
    countries: CARD_HOLDER_COUNTRIES,
    note: CARD_HOLDER_NOTE,
    catalog: { name: 'identification-types', source: 'unknown' },
  }),
  accounts({
    label: 'Número de identificación',
    label_en: 'Identification number',
    key: 'card_identification_number',
    collection: 'additional_cards',
    type: 'string',
    required: 'when_visible',
    visible_when: cardWhen(NEW_CARD_HOLDER),
    countries: CARD_HOLDER_COUNTRIES,
    note: CARD_HOLDER_NOTE,
  }),
  accounts({
    label: 'Origen de fondos',
    label_en: 'Source of funds',
    key: 'funds_origin_id',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'funds-origins', source: 'unknown' },
  }),
  accounts({
    label: 'País del principal origen de la fondos de la cuenta',
    label_es: 'País del principal origen de los fondos de la cuenta',
    label_en: 'Country of the main source of the account funds',
    section_header: 'Descripción detallada del origen de fondos la cuenta',
    key: 'funds_origin_country_id',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'countries', source: 'unknown' },
  }),
  accounts({
    label: 'Propósito de la cuenta',
    label_en: 'Purpose of the account',
    key: 'account_purpose_id',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'account-purposes', source: 'unknown' },
  }),
  accounts({
    label: 'Indique la principal operación que realizará',
    label_en: 'Main operation the account will carry out',
    key: 'main_operation_id',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'main-operations', source: 'unknown' },
  }),
  accounts({
    label: 'Descripción detallada del propósito de la cuenta',
    label_en: 'Detailed description of the purpose of the account',
    key: 'account_purpose_description',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    max_length: 250,
    note: 'Sheet gives no limit; 250 characters assumed like the company overlay (to be confirmed).',
  }),
  accounts({
    label: 'País de procedencia de las transferencias',
    label_en: 'Country the transfers come from',
    section_header: 'Descripción detallada del origen de fondos la cuenta',
    key: 'incoming_transfers_country_id',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'countries', source: 'unknown' },
  }),
  accounts({
    label: 'País de destino de las transferencias',
    label_en: 'Country the transfers are sent to',
    section_header: 'Descripción detallada del origen de fondos la cuenta',
    key: 'outgoing_transfers_country_id',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'countries', source: 'unknown' },
  }),
  accounts({
    label: '¿La cuenta se utilizará para fines operativos?',
    label_en: 'Will the account be used for operating purposes?',
    key: 'operational_use',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'boolean',
    required: 'when_visible',
  }),
  accounts({
    label: 'Emails autorizados para enviar los estados de cuenta',
    label_en: 'Emails authorized to receive the account statements',
    key: 'statement_emails',
    collection: 'accounts',
    item_tab: 'compliance',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    note: 'BLPA sheet note: more than one address can be declared. Modeled as free text (comma-separated); a multi-value email field does not exist yet.',
  }),
  accounts({
    label: 'Indique el No. de créditos promedio mensual',
    label_en: 'Average monthly number of credits',
    key: 'monthly_credit_count',
    collection: 'accounts',
    item_tab: 'transactional_profile',
    type: 'integer',
    required: 'when_visible',
    validation: MIN_ZERO,
    note: 'Must be a positive integer.',
  }),
  accounts({
    label: 'Indique el No. de débitos promedio mensual',
    label_en: 'Average monthly number of debits',
    key: 'monthly_debit_count',
    collection: 'accounts',
    item_tab: 'transactional_profile',
    type: 'integer',
    required: 'when_visible',
    validation: MIN_ZERO,
    note: 'Must be a positive integer.',
  }),
  accounts({
    label: 'Indique monto promedio de créditos mensual',
    label_en: 'Average monthly credit amount',
    key: 'monthly_credit_amount',
    help: {
      es: 'Su equivalente anual no puede superar las ventas declaradas en Actividad económica.',
      en: 'Its annual equivalent cannot exceed the sales declared in Economic activity.',
    },
    collection: 'accounts',
    item_tab: 'transactional_profile',
    type: 'decimal',
    required: 'when_visible',
    validation: [
      ...MIN_ZERO,
      {
        sum_lte: {
          sum: ['monthly_credit_amount'],
          limit: [ANNUAL_SALES],
          factor: 12,
        },
        message_key: CREDITS_EXCEED_SALES,
      },
    ],
    note: 'POC cuentas.ts creditosContraVentas (ITDFCJ-30 CA-4): the amount x 12 must not exceed the annual sales of the economic-activity step (read across steps; skipped while they are empty), error on this field. The sheet says the credit count; POC wins (amount).',
  }),
  accounts({
    label: 'Indique monto promedio de débitos mensual',
    label_en: 'Average monthly debit amount',
    key: 'monthly_debit_amount',
    help: {
      es: 'No puede superar el monto de créditos declarado.',
      en: 'It cannot exceed the declared credit amount.',
    },
    collection: 'accounts',
    item_tab: 'transactional_profile',
    type: 'decimal',
    required: 'when_visible',
    validation: [
      ...MIN_ZERO,
      {
        lte_field: 'monthly_credit_amount',
        message_key: DEBITS_EXCEED_CREDITS,
      },
    ],
    note: 'Sheet and POC cuentas.ts debitosContraCreditos (ITDFCJ-30 CA-4): debits must not exceed the credits of the same account, error on this field.',
  }),
  accounts({
    label: 'Monto promedio mensual esperado',
    label_en: 'Expected average monthly amount',
    key: 'expected_monthly_amount',
    collection: 'accounts',
    item_tab: 'transactional_profile',
    type: 'decimal',
    required: 'when_visible',
    validation: MIN_ZERO,
  }),
  ...(
    [
      [
        'Cantidad de transacciones en efectivo a recibir',
        'Number of cash transactions to receive',
        'cash_in_count',
        'integer',
      ],
      [
        'Monto en efectivo a recibir (U$)',
        'Cash amount to receive (US$)',
        'cash_in_amount',
        'decimal',
      ],
      [
        'Cantidad de cheques a recibir',
        'Number of checks to receive',
        'checks_in_count',
        'integer',
      ],
      [
        'Monto en cheques a recibir (U$)',
        'Checks amount to receive (US$)',
        'checks_in_amount',
        'decimal',
      ],
      [
        'Cantidad de transferencias internacionales a recibir',
        'Number of international transfers to receive',
        'international_in_count',
        'integer',
      ],
      [
        'Monto de transferencias internacionales a recibir (U$)',
        'International transfers amount to receive (US$)',
        'international_in_amount',
        'decimal',
      ],
      [
        'Cantidad de transferencias regionales de bancos del grupo LAFISE a recibir',
        'Number of regional transfers from LAFISE group banks to receive',
        'regional_in_count',
        'integer',
      ],
      [
        'Monto de transferencias regionales de bancos del grupo LAFISE a recibir (U$)',
        'Regional transfers from LAFISE group banks amount to receive (US$)',
        'regional_in_amount',
        'decimal',
      ],
      [
        'Cantidad de transferencias de bancos locales (ACH) a recibir',
        'Number of local bank (ACH) transfers to receive',
        'ach_in_count',
        'integer',
      ],
      [
        'Monto de transferencias de bancos locales (ACH) a recibir (U$)',
        'Local bank (ACH) transfers amount to receive (US$)',
        'ach_in_amount',
        'decimal',
      ],
    ] as const
  ).map(([label, label_en, key, type]) =>
    accounts({
      label,
      label_en,
      key,
      collection: 'accounts',
      type,
      required: 'when_visible',
      validation:
        type === 'decimal' ?
          [
            ...MIN_ZERO,
            {
              sum_lte: { sum: IN_AMOUNTS, limit: [ANNUAL_SALES], factor: 12 },
              message_key: CREDITS_EXCEED_SALES,
            },
          ]
        : MIN_ZERO,
      note: `${PROFILE_NOTE} Sheet and POC cuentas.ts depositosContraVentas (ITDFCJ-30): the sum of the amounts to receive must not exceed the monthly sales (annual sales of the economic-activity step / 12, read across steps), error on each amount to receive.`,
    }),
  ),
  ...(
    [
      [
        'Cantidad de transacciones en efectivo a enviar',
        'Number of cash transactions to send',
        'cash_out_count',
        'integer',
      ],
      [
        'Monto en efectivo a enviar (U$)',
        'Cash amount to send (US$)',
        'cash_out_amount',
        'decimal',
      ],
      [
        'Cantidad de cheques a emitir',
        'Number of checks to issue',
        'checks_out_count',
        'integer',
      ],
      [
        'Monto en cheques a emitir (U$)',
        'Checks amount to issue (US$)',
        'checks_out_amount',
        'decimal',
      ],
      [
        'Cantidad de transferencias internacionales a enviar',
        'Number of international transfers to send',
        'international_out_count',
        'integer',
      ],
      [
        'Monto de transferencias internacionales a enviar (U$)',
        'International transfers amount to send (US$)',
        'international_out_amount',
        'decimal',
      ],
      [
        'Cantidad de transferencias regionales de bancos del grupo LAFISE a enviar',
        'Number of regional transfers to LAFISE group banks to send',
        'regional_out_count',
        'integer',
      ],
      [
        'Monto de transferencias regionales de bancos del grupo LAFISE a enviar (U$)',
        'Regional transfers to LAFISE group banks amount to send (US$)',
        'regional_out_amount',
        'decimal',
      ],
      [
        'Cantidad de transferencias de bancos locales (ACH) a enviar',
        'Number of local bank (ACH) transfers to send',
        'ach_out_count',
        'integer',
      ],
      [
        'Monto de transferencias de bancos locales (ACH) a enviar (U$)',
        'Local bank (ACH) transfers amount to send (US$)',
        'ach_out_amount',
        'decimal',
      ],
    ] as const
  ).map(([label, label_en, key, type], index) =>
    accounts({
      label,
      label_en,
      key,
      collection: 'accounts',
      type,
      required: 'when_visible',
      validation:
        type === 'decimal' ?
          [
            ...MIN_ZERO,
            {
              sum_lte: { sum: OUT_AMOUNTS, limit: IN_AMOUNTS },
              message_key: DEBITS_EXCEED_CREDITS,
            },
          ]
        : MIN_ZERO,
      // Right after the receive pair of the same instrument (rows 41-50 receive, 51-60 send).
      sort_row: 42 + 2 * Math.floor(index / 2) + 0.1 * ((index % 2) + 1),
      note: `${PROFILE_NOTE} POC cuentas.ts orders the instruments receive then send, one instrument at a time (the sheet lists every receive row first). Sheet and POC cuentas.ts retirosContraDepositos (ITDFCJ-30): the sum of the amounts to send must not exceed the sum of the amounts to receive of the account, error on each amount to send.`,
    }),
  ),
  accounts({
    label:
      '¿El autorizado a registrar es uno de los relacionados previamente registrados?',
    label_en:
      'Is the authorized person one of the previously registered related parties?',
    key: 'authorized_is_related_party',
    collection: 'authorized_persons',
    type: 'boolean',
    required: 'when_visible',
  }),
  accounts({
    label: 'Lista de relacionados',
    label_es:
      'Lista de relacionados (personas naturales de primer nivel accionario)',
    label_en: 'List of related parties (first-level individual shareholders)',
    key: 'authorized_related_party_id',
    full_width: true,
    collection: 'authorized_persons',
    type: 'catalog',
    required: 'when_visible',
    visible_when: { field: 'authorized_is_related_party', eq: true },
    catalog: {
      name: 'related-persons',
      source: 'request',
      roles: ['shareholder'],
    },
    note: 'POC cuentas.ts lists the related parties with the shareholder role (conRol Accionista); the BLPA sheet note says the related parties authorized to give instructions. POC keeps the authorized person as plain account fields; kept as a child collection (the sheet nests "Autorizados").',
  }),
  accounts({
    label: 'Nombre completo',
    label_en: 'Full name',
    key: 'authorized_full_name',
    collection: 'authorized_persons',
    type: 'string',
    required: 'when_visible',
    visible_when: { field: 'authorized_is_related_party', eq: false },
  }),
  accounts({
    label: 'Correo electrónico',
    label_en: 'Email',
    key: 'authorized_email',
    collection: 'authorized_persons',
    type: 'email',
    required: 'when_visible',
    visible_when: { field: 'authorized_is_related_party', eq: false },
    note: 'Sheet types it Texto; modeled as email.',
  }),
  accounts({
    label:
      '¿Desea mantener la misma combinacion y firmantes de la primera cuenta?',
    label_es:
      '¿Desea mantener la misma combinación y firmantes en todas sus cuentas?',
    label_en:
      'Do you want to keep the same combination and signers in all your accounts?',
    key: 'keep_first_account_signers',
    collection: 'accounts',
    item_tab: 'signers',
    type: 'boolean',
    required: 'when_visible',
    note: 'Sheet rows sit inside the signers collection, but the question is about the account (POC: account-level). POC asks about all the accounts, the sheet about the first one; POC wins. Reusing the signers is not modeled.',
  }),
  accounts({
    label: 'Lista de firmantes',
    label_en: 'List of signers',
    key: 'signer_id',
    help: {
      es: 'Solo personas naturales registradas con el rol de Firmante en Socios y relacionados.',
      en: 'Only individuals registered with the Signer role in Partners and related parties.',
    },
    collection: 'signers',
    type: 'catalog',
    required: 'when_visible',
    catalog: {
      name: 'related-persons',
      source: 'request',
      roles: ['signatory'],
      unlisted_key: 'signer_unlisted',
    },
    note: 'POC cuentas.ts: the related parties with the signer role (conRol Firmante), stored by identity; one that loses the person or the role flags the account (POC avisoDeCuentas).',
  }),
  accounts({
    label: 'Tipo de firma',
    label_en: 'Signature type',
    key: 'signature_type_id',
    collection: 'signers',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'signature-types', source: 'unknown' },
    note: 'Option codes used by the sheet conditions are provisional (joint, individual).',
  }),
  accounts({
    label: 'Categoría',
    label_en: 'Category',
    key: 'signer_category_id',
    collection: 'signers',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'signer-categories', source: 'unknown' },
    note: 'Sheet: with the joint signature type there must be at least two records in the same category. POC cuentas.ts (firmantes, ITDFCJ-30 CA-3) only counts the signers (collections.signers.min_items_when_any); POC wins, the category is not checked.',
  }),
  accounts({
    label: 'Seleccione el tipo de combinación',
    label_en: 'Select the combination type',
    key: 'signature_combination_id',
    collection: 'signers',
    type: 'catalog',
    required: 'when_visible',
    visible_when: JOINT,
    catalog: { name: 'signature-combinations', source: 'unknown' },
    note: 'POC cuentas.ts shows it for joint signatures in every country; the sheet shows it always in HN. POC wins.',
  }),
  accounts({
    label: '¿Desea establecer montos máximos de fondos a este firmante?',
    label_es:
      '¿Desea establecer montos máximos de fondos a mover para esta cuenta?',
    label_en:
      'Do you want to set maximum amounts of funds to move for this account?',
    key: 'has_account_limit',
    collection: 'accounts',
    item_tab: 'signers',
    regrouped: true,
    type: 'boolean',
    required: 'when_visible',
    note: 'POC cuentas.ts asks it once per account in the "Firmantes" tab, after the signers; the sheet asks it per signer. POC wins.',
  }),
  accounts({
    label: 'Monto máximo',
    label_en: 'Maximum amount',
    key: 'account_limit_amount',
    collection: 'accounts',
    item_tab: 'signers',
    regrouped: true,
    type: 'decimal',
    required: 'when_visible',
    visible_when: { field: 'has_account_limit', eq: true },
    validation: MIN_ZERO,
    note: 'POC cuentas.ts: an account amount (decimal) in the "Firmantes" tab; the sheet types it Entero per signer. POC wins.',
  }),
  transfers({
    label: '¿Realizará transferencias internacionales?',
    label_en: 'Will you make international transfers?',
    key: 'will_make_international_transfers',
    collection: 'accounts',
    item_tab: 'transfers',
    type: 'boolean',
    required: 'when_visible',
  }),
  transfers({
    label: 'País de destino de las transferencias',
    label_en: 'Destination country of the transfers',
    section_header: 'Transferencias internacionales',
    key: 'transfer_destination_country_id',
    collection: 'outgoing_transfers',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'countries', source: 'unknown' },
    // POC cuentas.ts paisPermitido: a prohibited country is an inline error.
    validation: [{ not_prohibited: true }],
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
  transfers({
    label: 'Concepto',
    label_en: 'Concept',
    key: 'transfer_concept',
    collection: 'outgoing_transfers',
    type: 'string',
    required: 'when_visible',
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
  transfers({
    label: 'Cantidad mensual de transferencias',
    label_en: 'Monthly number of transfers',
    section_header: 'Transferencias internacionales',
    key: 'outgoing_transfer_count',
    collection: 'outgoing_transfers',
    type: 'integer',
    required: 'when_visible',
    validation: MIN_ZERO,
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
  transfers({
    label: 'Monto mensual a enviar USD$',
    label_en: 'Monthly amount to send (US$)',
    key: 'outgoing_transfer_amount',
    collection: 'outgoing_transfers',
    type: 'decimal',
    required: 'when_visible',
    validation: MIN_ZERO,
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
  transfers({
    label: 'País de procedencia de las transferencias',
    label_en: 'Country the transfers come from',
    section_header: 'Transferencias internacionales',
    key: 'transfer_origin_country_id',
    collection: 'incoming_transfers',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'countries', source: 'unknown' },
    // POC cuentas.ts paisPermitido: a prohibited country is an inline error.
    validation: [{ not_prohibited: true }],
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
  transfers({
    label: 'Cantidad mensual de transferencias',
    label_en: 'Monthly number of transfers',
    section_header: 'Concepto',
    key: 'incoming_transfer_count',
    collection: 'incoming_transfers',
    type: 'integer',
    required: 'when_visible',
    validation: MIN_ZERO,
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
  transfers({
    label: 'Monto mensual a recibir USD$',
    label_en: 'Monthly amount to receive (US$)',
    key: 'incoming_transfer_amount',
    collection: 'incoming_transfers',
    type: 'decimal',
    required: 'when_visible',
    validation: MIN_ZERO,
    visible_when: { field: 'will_make_international_transfers', eq: true },
  }),
];

/** Entries of both tabs; each one names its `tab`. */
const entries: OverlayEntry[] = [...referenceEntries, ...accountEntries];

const referencesAccountsOverlay: Overlay = {
  tabs: [REFERENCES_TAB, ACCOUNTS_TAB],
  name: 'references-accounts',
  entries,
  // POC: referencias.ts (minimo 2) and cuentas.ts (cuentas minimo 1; firmantes and transferencias have none).
  // Cards, authorized persons and signers are child collections of each account. The sheet opens
  // "Autorizados" without [Fin], so "Firmantes" reads as nested in it; POC cuentas.ts puts the
  // signers directly in the account, next to the authorized persons.
  // Item tabs follow the POC `pestana` of each account field; the PA instruments have no tab
  // (POC `instrumentosPanama`), so they render above the tabs as there.
  collections: {
    references: { min_items: 2 },
    accounts: { min_items: 1 },
    additional_cards: { parent: 'accounts', item_tab: 'checkbook_card' },
    authorized_persons: {
      parent: 'accounts',
      item_tab: 'transactional_profile',
    },
    signers: {
      parent: 'accounts',
      item_tab: 'signers',
      // POC cuentas.ts firmantes (ITDFCJ-30 CA-3): a joint signature needs at least two signers, error on the list.
      min_items_when_any: { item: JOINT, min: 2, message_key: 'joint_signers' },
    },
    outgoing_transfers: { parent: 'accounts', item_tab: 'transfers' },
    incoming_transfers: { parent: 'accounts', item_tab: 'transfers' },
  },
};

export { referencesAccountsOverlay };
